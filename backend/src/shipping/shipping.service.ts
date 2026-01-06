import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payments/payment.service';
import { ShippingStatus, DeliveryAgentStatus, OrderStatus, Prisma } from '@prisma/client';

/**
 * ShippingService
 * 
 * Manages the order fulfillment and delivery lifecycle from shipment initiation to delivery confirmation.
 * 
 * CRITICAL ARCHITECTURAL PRINCIPLE - GOLDEN RULE:
 * This service NEVER touches money, ledger, or wallets directly.
 * Financial operations are DELEGATED to PaymentService.
 * 
 * RESPONSIBILITIES:
 * - Shipment lifecycle management (state machine enforcement)
 * - Delivery agent assignment and tracking
 * - Order status updates related to shipping
 * - COD delivery confirmation integration (via PaymentService delegation)
 * - Audit trail creation (ShippingLog)
 * 
 * NOT RESPONSIBLE FOR:
 * - Payment capture logic (delegates to PaymentService.capturePayment)
 * - Ledger entry creation (NO access to LedgerService)
 * - Wallet balance updates (NO access to WalletService)
 * - Shipping cost calculation (already set during order creation)
 * - Order confirmation (seller responsibility in OrderService)
 * 
 * STATE MACHINE (8 states):
 * PENDING → ASSIGNED → ACCEPTED → PICKED_UP → IN_TRANSIT → DELIVERED
 *    ↓         ↓
 * CANCELLED CANCELLED
 *                                              ↓
 *                                           FAILED
 * 
 * TERMINAL STATES: DELIVERED, FAILED, CANCELLED (no transitions out)
 * 
 * IDEMPOTENCY:
 * - All state-changing operations are idempotent
 * - Repeating same operation with same status = no-op, return success
 * 
 * INTEGRATION POINTS:
 * 1. OrderService: Update order.status (SHIPPING, DELIVERED)
 * 2. PaymentService: Call capturePayment() for COD deliveries
 * 3. DeliveryAgent: Read-only queries for validation
 * 
 * VALIDATION RULES:
 * - Delivery proof REQUIRED for DELIVERED status
 * - Failure reason REQUIRED for FAILED status
 * - Agent can only act on assignments assigned to them
 * - State transitions follow approved state machine strictly
 * - Only ONE active assignment per order
 */
@Injectable()
export class ShippingService {
    private readonly logger = new Logger(ShippingService.name);

    // State transition matrix - defines allowed transitions
    private readonly ALLOWED_TRANSITIONS: Record<ShippingStatus, ShippingStatus[]> = {
        [ShippingStatus.PENDING]: [ShippingStatus.ASSIGNED, ShippingStatus.CANCELLED],
        [ShippingStatus.ASSIGNED]: [ShippingStatus.ACCEPTED, ShippingStatus.PENDING, ShippingStatus.CANCELLED],
        [ShippingStatus.ACCEPTED]: [ShippingStatus.PICKED_UP],
        [ShippingStatus.PICKED_UP]: [ShippingStatus.IN_TRANSIT],
        [ShippingStatus.IN_TRANSIT]: [ShippingStatus.DELIVERED, ShippingStatus.FAILED],
        [ShippingStatus.DELIVERED]: [], // Terminal
        [ShippingStatus.FAILED]: [], // Terminal
        [ShippingStatus.CANCELLED]: [], // Terminal
    };

    constructor(
        private prisma: PrismaService,
        private paymentService: PaymentService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Create initial shipping assignment
     * 
     * Called after order is confirmed by seller.
     * Creates assignment in PENDING status (no agent assigned yet).
     * 
     * @param orderId - Order ID to create assignment for
     * @returns Created shipping assignment
     * 
     * @throws NotFoundException if order not found
     * @throws BadRequestException if order not ready for shipping
     * @throws ConflictException if order already has active assignment
     */
    async createAssignment(orderId: string) {
        // Validate order exists
        const order = await this.prisma.orders.findUnique({
            where: { id: orderId },
            include: {
                shipping_assignments: {
                    where: {
                        status: {
                            notIn: [ShippingStatus.CANCELLED, ShippingStatus.FAILED],
                        },
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        // Check order status (must be CONFIRMED or later)
        if (order.status === OrderStatus.PENDING) {
            throw new BadRequestException(
                `Order ${order.orderNumber} not confirmed yet - cannot create shipping assignment`,
            );
        }

        // Check for existing active assignment
        if (order.shipping_assignments.length > 0) {
            throw new ConflictException(
                `Order ${order.orderNumber} already has an active shipping assignment`,
            );
        }

        // Calculate estimated delivery time (simple: +2 days from now)
        const estimatedDeliveryTime = new Date();
        estimatedDeliveryTime.setDate(estimatedDeliveryTime.getDate() + 2);

        // Create assignment
        const assignment = await this.prisma.shipping_assignments.create({
            data: {
                id: crypto.randomUUID(),
                orderId: order.id,
                agentId: null, // Unassigned initially
                status: ShippingStatus.PENDING,
                assignedBy: 'system',
                estimatedDeliveryTime,
            },
            include: {
                orders: {
                    select: {
                        id: true,
                        orderNumber: true,
                        deliveryAddress: true,
                        deliveryZipCode: true,
                    },
                },
            },
        });

        // Create initial log
        await this.createShippingLog(
            assignment.id,
            null,
            ShippingStatus.PENDING,
            'system',
            `Shipping assignment created for order ${order.orderNumber}`,
        );

        this.logger.log({
            event: 'assignment_created',
            assignmentId: assignment.id,
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: ShippingStatus.PENDING,
        });

        return assignment;
    }

    /**
     * Assign delivery agent to assignment
     * 
     * Transitions: PENDING → ASSIGNED
     * Manual assignment only (no auto-assignment logic per approved design).
     * 
     * @param assignmentId - Shipping assignment ID
     * @param agentId - Delivery agent ID to assign
     * @param assignedBy - User ID performing assignment (admin/seller)
     * @returns Updated shipping assignment
     * 
     * @throws NotFoundException if assignment or agent not found
     * @throws BadRequestException if assignment not in PENDING state or agent not available
     */
    async assignAgent(assignmentId: string, agentId: string, assignedBy: string) {
        // Get assignment with order
        const assignment = await this.prisma.shipping_assignments.findUnique({
            where: { id: assignmentId },
            include: {
                orders: true,
            },
        });

        if (!assignment) {
            throw new NotFoundException(`Shipping assignment ${assignmentId} not found`);
        }

        // Idempotency: Already assigned to this agent
        if (assignment.status === ShippingStatus.ASSIGNED && assignment.agentId === agentId) {
            this.logger.warn({
                event: 'assignment_already_assigned',
                assignmentId,
                agentId,
                message: 'Agent already assigned (idempotent)',
            });
            return assignment;
        }

        // Validate current status
        if (assignment.status !== ShippingStatus.PENDING) {
            throw new BadRequestException(
                `Assignment ${assignmentId} status is ${assignment.status} - can only assign agent when PENDING`,
            );
        }

        // Validate agent exists and is available
        const agent = await this.prisma.delivery_agents.findUnique({
            where: { id: agentId },
            include: { users: true },
        });

        if (!agent) {
            throw new NotFoundException(`Delivery agent ${agentId} not found`);
        }

        if (agent.status !== DeliveryAgentStatus.ACTIVE) {
            throw new BadRequestException(
                `Agent ${agent.agentCode} is ${agent.status} - must be ACTIVE`,
            );
        }

        if (!agent.isAvailable) {
            throw new BadRequestException(
                `Agent ${agent.agentCode} is not available`,
            );
        }

        // Optional: Check if agent serves delivery zip code
        if (
            assignment.orders.deliveryZipCode &&
            agent.serviceZipCodes.length > 0 &&
            !agent.serviceZipCodes.includes(assignment.orders.deliveryZipCode)
        ) {
            this.logger.warn({
                event: 'agent_zip_mismatch',
                assignmentId,
                agentId,
                deliveryZipCode: assignment.orders.deliveryZipCode,
                agentZipCodes: agent.serviceZipCodes,
                message: 'Agent does not serve delivery zip code (allowing anyway)',
            });
        }

        // Update assignment
        const updated = await this.prisma.shipping_assignments.update({
            where: { id: assignmentId },
            data: {
                agentId: agent.id,
                status: ShippingStatus.ASSIGNED,
                assignedBy,
                assignedAt: new Date(),
            },
            include: {
                orders: true,
                delivery_agents: {
                    include: { users: true },
                },
            },
        });

        // Create log
        await this.createShippingLog(
            assignmentId,
            ShippingStatus.PENDING,
            ShippingStatus.ASSIGNED,
            assignedBy,
            `Assigned to agent ${agent.agentCode} (${agent.users.firstName} ${agent.users.lastName})`,
        );

        this.logger.log({
            event: 'agent_assigned',
            assignmentId,
            agentId: agent.id,
            agentCode: agent.agentCode,
            orderNumber: assignment.orders.orderNumber,
            assignedBy,
        });

        // Emit shipment.assigned event (async, post-commit)
        try {
            await this.eventEmitter.emitAsync('shipment.assigned', {
                assignmentId: updated.id,
                orderId: updated.orderId,
                orderNumber: updated.orders.orderNumber,
                agentId: agent.id,
                agentCode: agent.agentCode,
                agentName: `${agent.users.firstName} ${agent.users.lastName}`,
                assignedAt: updated.assignedAt?.toISOString(),
                assignedBy,
            });
        } catch (error) {
            this.logger.error({
                event: 'event_emission_failed',
                eventType: 'shipment.assigned',
                assignmentId,
                error: error.message,
            });
        }

        return updated;
    }

    /**
     * Unassign agent from assignment
     * 
     * Transitions: ASSIGNED → PENDING
     * Allows reassignment to different agent.
     * 
     * @param assignmentId - Shipping assignment ID
     * @param userId - User ID performing unassignment (admin/seller)
     * @returns Updated shipping assignment
     * 
     * @throws NotFoundException if assignment not found
     * @throws BadRequestException if assignment not in ASSIGNED state
     */
    async unassignAgent(assignmentId: string, userId: string) {
        const assignment = await this.prisma.shipping_assignments.findUnique({
            where: { id: assignmentId },
            include: {
                orders: true,
                delivery_agents: true,
            },
        });

        if (!assignment) {
            throw new NotFoundException(`Shipping assignment ${assignmentId} not found`);
        }

        // Idempotency: Already unassigned
        if (assignment.status === ShippingStatus.PENDING && !assignment.agentId) {
            this.logger.warn({
                event: 'assignment_already_unassigned',
                assignmentId,
                message: 'Agent already unassigned (idempotent)',
            });
            return assignment;
        }

        // Validate current status
        if (assignment.status !== ShippingStatus.ASSIGNED) {
            throw new BadRequestException(
                `Assignment ${assignmentId} status is ${assignment.status} - can only unassign when ASSIGNED`,
            );
        }

        const previousAgentCode = assignment.delivery_agents?.agentCode || 'unknown';

        // Update assignment
        const updated = await this.prisma.shipping_assignments.update({
            where: { id: assignmentId },
            data: {
                agentId: null,
                status: ShippingStatus.PENDING,
            },
            include: {
                orders: true,
            },
        });

        // Create log
        await this.createShippingLog(
            assignmentId,
            ShippingStatus.ASSIGNED,
            ShippingStatus.PENDING,
            userId,
            `Unassigned from agent ${previousAgentCode}`,
        );

        this.logger.log({
            event: 'agent_unassigned',
            assignmentId,
            previousAgent: previousAgentCode,
            orderNumber: assignment.orders.orderNumber,
            unassignedBy: userId,
        });

        return updated;
    }

    /**
     * Agent accepts assignment
     * 
     * Transitions: ASSIGNED → ACCEPTED
     * Agent commits to fulfilling this delivery.
     * 
     * @param assignmentId - Shipping assignment ID
     * @param agentUserId - Agent's user ID (for validation)
     * @returns Updated shipping assignment
     * 
     * @throws NotFoundException if assignment not found
     * @throws BadRequestException if assignment not in ASSIGNED state or agent mismatch
     */
    async acceptAssignment(assignmentId: string, agentUserId: string) {
        // Sprint 8 Track D: Use row-level lock to prevent concurrent acceptance race condition
        return await this.prisma.$transaction(async (tx) => {
            // Acquire row lock with 5 second timeout
            const [assignment] = await tx.$queryRaw<any[]>`
                SELECT sa.*, a.user_id, a.agent_code, o.order_number
                FROM shipping_assignments sa
                INNER JOIN delivery_agents a ON sa.agent_id = a.id
                INNER JOIN orders o ON sa.order_id = o.id
                WHERE sa.id = ${assignmentId}::uuid
                FOR UPDATE NOWAIT
            `;

            if (!assignment) {
                throw new NotFoundException(`Shipping assignment ${assignmentId} not found`);
            }

            // Idempotency: Already accepted
            if (assignment.status === ShippingStatus.ACCEPTED) {
                this.logger.warn({
                    event: 'assignment_already_accepted',
                    assignmentId,
                    agentUserId,
                    message: 'Assignment already accepted (idempotent)',
                });
                // Return full object from database
                return await tx.shipping_assignments.findUnique({
                    where: { id: assignmentId },
                    include: {
                        orders: true,
                        delivery_agents: {
                            include: { users: true },
                        },
                    },
                });
            }

            // Validate agent ownership
            if (assignment.user_id !== agentUserId) {
                throw new BadRequestException(
                    `Assignment ${assignmentId} is not assigned to this agent`,
                );
            }

            // Validate current status
            if (assignment.status !== ShippingStatus.ASSIGNED) {
                throw new BadRequestException(
                    `Assignment ${assignmentId} status is ${assignment.status} - can only accept when ASSIGNED`,
                );
            }

            // Update assignment
            const updated = await tx.shipping_assignments.update({
                where: { id: assignmentId },
                data: {
                    status: ShippingStatus.ACCEPTED,
                    acceptedAt: new Date(),
                },
                include: {
                    orders: true,
                    delivery_agents: {
                        include: { users: true },
                    },
                },
            });

            // Create log
            await this.createShippingLog(
                assignmentId,
                ShippingStatus.ASSIGNED,
                ShippingStatus.ACCEPTED,
                agentUserId,
                `Agent ${assignment.agent_code} accepted assignment`,
                tx,
            );

            this.logger.log({
                event: 'shipping_assignment_accepted',
                assignmentId,
                agentCode: assignment.agent_code,
                orderNumber: assignment.order_number,
                duration: 0,
            });

            return updated;
        }, {
            timeout: 5000, // 5 second timeout for lock acquisition
        }).catch((error) => {
            // Handle lock timeout
            if (error.code === '55P03') { // PostgreSQL lock_not_available error code
                this.logger.error({
                    event: 'shipping_assignment_conflict',
                    assignmentId,
                    agentUserId,
                    error: 'Failed to acquire row lock - concurrent acceptance attempt',
                });
                throw new ConflictException(
                    'This assignment is being processed by another request. Please try again.',
                );
            }
            throw error;
        });
    }

    /**
     * Agent confirms pickup from seller
     * 
     * Transitions: ACCEPTED → PICKED_UP
     * Also updates Order.status = SHIPPING, Order.shippedAt = now()
     * 
     * @param assignmentId - Shipping assignment ID
     * @param agentUserId - Agent's user ID (for validation)
     * @param location - Optional pickup location
     * @returns Updated shipping assignment
     * 
     * @throws NotFoundException if assignment not found
     * @throws BadRequestException if assignment not in ACCEPTED state or agent mismatch
     */
    async confirmPickup(assignmentId: string, agentUserId: string, location?: string) {
        const assignment = await this.prisma.shipping_assignments.findUnique({
            where: { id: assignmentId },
            include: {
                orders: true,
                delivery_agents: {
                    include: { users: true },
                },
            },
        });

        if (!assignment) {
            throw new NotFoundException(`Shipping assignment ${assignmentId} not found`);
        }

        // Idempotency: Already picked up
        if (assignment.status === ShippingStatus.PICKED_UP) {
            this.logger.warn({
                event: 'assignment_already_picked_up',
                assignmentId,
                agentUserId,
                message: 'Assignment already picked up (idempotent)',
            });
            return assignment;
        }

        // Validate agent ownership
        if (assignment.delivery_agents?.userId !== agentUserId) {
            throw new BadRequestException(
                `Assignment ${assignmentId} is not assigned to this agent`,
            );
        }

        // Validate current status
        if (assignment.status !== ShippingStatus.ACCEPTED) {
            throw new BadRequestException(
                `Assignment ${assignmentId} status is ${assignment.status} - can only pickup when ACCEPTED`,
            );
        }

        // Update assignment and order in transaction
        const updated = await this.prisma.$transaction(async (tx) => {
            // Update assignment
            const updatedAssignment = await tx.shipping_assignments.update({
                where: { id: assignmentId },
                data: {
                    status: ShippingStatus.PICKED_UP,
                    pickedUpAt: new Date(),
                },
                include: {
                    orders: true,
                    delivery_agents: {
                        include: { users: true },
                    },
                },
            });

            // Update order status to SHIPPING
            await tx.orders.update({
                where: { id: assignment.orderId },
                data: {
                    status: OrderStatus.SHIPPING,
                    shippedAt: new Date(),
                },
            });

            return updatedAssignment;
        });

        // Create log
        await this.createShippingLog(
            assignmentId,
            ShippingStatus.ACCEPTED,
            ShippingStatus.PICKED_UP,
            agentUserId,
            `Agent ${assignment.delivery_agents?.agentCode} picked up order`,
            undefined, // tx
            location,
        );

        this.logger.log({
            event: 'pickup_confirmed',
            assignmentId,
            orderId: assignment.orderId,
            orderNumber: assignment.orders.orderNumber,
            agentCode: assignment.delivery_agents?.agentCode,
        });

        // Emit shipment.picked_up event (async, post-commit)
        try {
            await this.eventEmitter.emitAsync('shipment.picked_up', {
                assignmentId: updated.id,
                orderId: updated.orderId,
                orderNumber: updated.orders.orderNumber,
                agentId: updated.agentId,
                agentCode: updated.delivery_agents?.agentCode,
                pickedUpAt: updated.pickedUpAt?.toISOString(),
                location,
            });
        } catch (error) {
            this.logger.error({
                event: 'event_emission_failed',
                eventType: 'shipment.picked_up',
                assignmentId,
                error: error.message,
            });
        }

        return updated;
    }

    /**
     * Agent starts transit to buyer
     * 
     * Transitions: PICKED_UP → IN_TRANSIT
     * Explicit action per approved design (Decision #2).
     * 
     * @param assignmentId - Shipping assignment ID
     * @param agentUserId - Agent's user ID (for validation)
     * @param location - Optional current location
     * @returns Updated shipping assignment
     * 
     * @throws NotFoundException if assignment not found
     * @throws BadRequestException if assignment not in PICKED_UP state or agent mismatch
     */
    async startTransit(assignmentId: string, agentUserId: string, location?: string) {
        const assignment = await this.prisma.shipping_assignments.findUnique({
            where: { id: assignmentId },
            include: {
                orders: true,
                delivery_agents: {
                    include: { users: true },
                },
            },
        });

        if (!assignment) {
            throw new NotFoundException(`Shipping assignment ${assignmentId} not found`);
        }

        // Idempotency: Already in transit
        if (assignment.status === ShippingStatus.IN_TRANSIT) {
            this.logger.warn({
                event: 'assignment_already_in_transit',
                assignmentId,
                agentUserId,
                message: 'Assignment already in transit (idempotent)',
            });
            return assignment;
        }

        // Validate agent ownership
        if (assignment.delivery_agents?.userId !== agentUserId) {
            throw new BadRequestException(
                `Assignment ${assignmentId} is not assigned to this agent`,
            );
        }

        // Validate current status
        if (assignment.status !== ShippingStatus.PICKED_UP) {
            throw new BadRequestException(
                `Assignment ${assignmentId} status is ${assignment.status} - can only start transit when PICKED_UP`,
            );
        }

        // Update assignment
        const updated = await this.prisma.shipping_assignments.update({
            where: { id: assignmentId },
            data: {
                status: ShippingStatus.IN_TRANSIT,
                inTransitAt: new Date(),
            },
            include: {
                orders: true,
                delivery_agents: {
                    include: { users: true },
                },
            },
        });

        // Create log
        await this.createShippingLog(
            assignmentId,
            ShippingStatus.PICKED_UP,
            ShippingStatus.IN_TRANSIT,
            agentUserId,
            `Agent ${assignment.delivery_agents?.agentCode} started delivery`,
            undefined, // tx
            location,
        );

        this.logger.log({
            event: 'transit_started',
            assignmentId,
            orderNumber: assignment.orders.orderNumber,
            agentCode: assignment.delivery_agents?.agentCode,
        });

        // Emit shipment.in_transit event (async, post-commit)
        try {
            await this.eventEmitter.emitAsync('shipment.in_transit', {
                assignmentId: updated.id,
                orderId: updated.orderId,
                orderNumber: updated.orders.orderNumber,
                agentId: updated.agentId,
                agentCode: updated.delivery_agents?.agentCode,
                inTransitAt: updated.inTransitAt?.toISOString(),
                location,
            });
        } catch (error) {
            this.logger.error({
                event: 'event_emission_failed',
                eventType: 'shipment.in_transit',
                assignmentId,
                error: error.message,
            });
        }

        return updated;
    }

    /**
     * Agent confirms delivery to buyer
     * 
     * Transitions: IN_TRANSIT → DELIVERED
     * Also updates:
     * - Order.status = DELIVERED, Order.deliveredAt = now()
     * - DeliveryAgent statistics (synchronously per Decision #4)
     * - IF COD: Delegates to PaymentService.capturePayment()
     * 
     * CRITICAL: Delivery proof REQUIRED per Decision #5.
     * CRITICAL: COD capture failure MUST NOT roll back shipment status per Decision #6.
     * 
     * @param assignmentId - Shipping assignment ID
     * @param agentUserId - Agent's user ID (for validation)
     * @param deliveryProof - Proof of delivery (photo URL or signature) - REQUIRED
     * @param notes - Optional delivery notes
     * @returns Updated shipping assignment
     * 
     * @throws NotFoundException if assignment not found
     * @throws BadRequestException if missing required fields or invalid state
     */
    async confirmDelivery(
        assignmentId: string,
        agentUserId: string,
        deliveryProof: string,
        notes?: string,
    ) {
        // Validate delivery proof provided (Decision #5)
        if (!deliveryProof || deliveryProof.trim() === '') {
            throw new BadRequestException(
                'Delivery proof is REQUIRED to mark delivery as completed',
            );
        }

        const assignment = await this.prisma.shipping_assignments.findUnique({
            where: { id: assignmentId },
            include: {
                orders: {
                    include: {
                        payments: true,
                    },
                },
                delivery_agents: {
                    include: { users: true },
                },
            },
        });

        if (!assignment) {
            throw new NotFoundException(`Shipping assignment ${assignmentId} not found`);
        }

        // Idempotency: Already delivered
        if (assignment.status === ShippingStatus.DELIVERED) {
            this.logger.warn({
                event: 'assignment_already_delivered',
                assignmentId,
                agentUserId,
                message: 'Assignment already delivered (idempotent)',
            });
            return assignment;
        }

        // Validate agent ownership
        if (assignment.delivery_agents?.userId !== agentUserId) {
            throw new BadRequestException(
                `Assignment ${assignmentId} is not assigned to this agent`,
            );
        }

        // Validate current status
        if (assignment.status !== ShippingStatus.IN_TRANSIT) {
            throw new BadRequestException(
                `Assignment ${assignmentId} status is ${assignment.status} - can only deliver when IN_TRANSIT`,
            );
        }

        const now = new Date();

        // Update assignment, order, and agent statistics in transaction
        const updated = await this.prisma.$transaction(async (tx) => {
            // Update assignment status
            const updatedAssignment = await tx.shipping_assignments.update({
                where: { id: assignmentId },
                data: {
                    status: ShippingStatus.DELIVERED,
                    deliveredAt: now,
                    actualDeliveryTime: now,
                    deliveryProof,
                    deliveryNotes: notes || assignment.deliveryNotes,
                },
                include: {
                    orders: {
                        include: {
                            payments: true,
                        },
                    },
                    delivery_agents: {
                        include: { users: true },
                    },
                },
            });

            // Update order status
            await tx.orders.update({
                where: { id: assignment.orderId },
                data: {
                    status: OrderStatus.DELIVERED,
                    deliveredAt: now,
                    actualDeliveryDate: now,
                },
            });

            // Update agent statistics synchronously (Decision #4)
            if (assignment.agentId) {
                await tx.delivery_agents.update({
                    where: { id: assignment.agentId },
                    data: {
                        totalDeliveries: { increment: 1 },
                        successfulDeliveries: { increment: 1 },
                    },
                });
            }

            return updatedAssignment;
        });

        // Create log
        await this.createShippingLog(
            assignmentId,
            ShippingStatus.IN_TRANSIT,
            ShippingStatus.DELIVERED,
            agentUserId,
            `Agent ${assignment.delivery_agents?.agentCode} delivered order to buyer`,
            undefined,
            notes,
        );

        this.logger.log({
            event: 'delivery_confirmed',
            assignmentId,
            orderId: assignment.orderId,
            orderNumber: assignment.orders.orderNumber,
            agentCode: assignment.delivery_agents?.agentCode,
            deliveryProof,
        });

        // Emit shipment.delivered event (async, post-commit)
        try {
            await this.eventEmitter.emitAsync('shipment.delivered', {
                assignmentId: updated.id,
                orderId: updated.orderId,
                orderNumber: updated.orders.orderNumber,
                agentId: updated.agentId,
                agentCode: updated.delivery_agents?.agentCode,
                deliveredAt: updated.deliveredAt?.toISOString(),
                deliveryProof,
                notes,
            });
        } catch (error) {
            this.logger.error({
                event: 'event_emission_failed',
                eventType: 'shipment.delivered',
                assignmentId,
                error: error.message,
            });
        }

        // Handle COD payment capture (AFTER shipment status updated per Decision #6)
        if (assignment.orders.payments?.paymentMethod === 'COD' && assignment.orders.payments) {
            try {
                this.logger.log({
                    event: 'cod_capture_initiated',
                    assignmentId,
                    paymentId: assignment.orders.payments.id,
                    orderNumber: assignment.orders.orderNumber,
                    message: 'Delegating COD payment capture to PaymentService',
                });

                // CRITICAL: Delegate to PaymentService - NO money logic here
                await this.paymentService.capturePayment({
                    paymentId: assignment.orders.payments.id,
                    confirmedBy: agentUserId,
                    confirmedAt: now,
                });

                this.logger.log({
                    event: 'cod_capture_success',
                    assignmentId,
                    paymentId: assignment.orders.payments.id,
                    orderNumber: assignment.orders.orderNumber,
                    message: 'COD payment captured successfully',
                });

            } catch (error) {
                // Decision #6: COD capture failure MUST NOT roll back shipment status
                this.logger.error({
                    event: 'cod_capture_failed',
                    assignmentId,
                    paymentId: assignment.orders.payments.id,
                    orderNumber: assignment.orders.orderNumber,
                    error: error.message,
                    message: 'COD payment capture failed - shipment status remains DELIVERED (per Decision #6)',
                });

                // NOTE: Shipment status remains DELIVERED even if payment capture fails
                // This is intentional per approved design
                // Manual intervention required to retry payment capture
            }
        }

        return updated;
    }

    /**
     * Agent reports delivery failure
     * 
     * Transitions: IN_TRANSIT → FAILED
     * Terminal state per Decision #3 (no auto-retry, no auto-reassignment).
     * Failure reason REQUIRED per business rules.
     * 
     * @param assignmentId - Shipping assignment ID
     * @param agentUserId - Agent's user ID (for validation)
     * @param failureReason - Reason for delivery failure - REQUIRED
     * @param notes - Optional additional notes
     * @returns Updated shipping assignment
     * 
     * @throws NotFoundException if assignment not found
     * @throws BadRequestException if missing failure reason or invalid state
     */
    async reportFailure(
        assignmentId: string,
        agentUserId: string,
        failureReason: string,
        notes?: string,
    ) {
        // Validate failure reason provided
        if (!failureReason || failureReason.trim() === '') {
            throw new BadRequestException(
                'Failure reason is REQUIRED when marking delivery as failed',
            );
        }

        const assignment = await this.prisma.shipping_assignments.findUnique({
            where: { id: assignmentId },
            include: {
                orders: true,
                delivery_agents: {
                    include: { users: true },
                },
            },
        });

        if (!assignment) {
            throw new NotFoundException(`Shipping assignment ${assignmentId} not found`);
        }

        // Idempotency: Already failed
        if (assignment.status === ShippingStatus.FAILED) {
            this.logger.warn({
                event: 'assignment_already_failed',
                assignmentId,
                agentUserId,
                message: 'Assignment already marked as failed (idempotent)',
            });
            return assignment;
        }

        // Validate agent ownership
        if (assignment.delivery_agents?.userId !== agentUserId) {
            throw new BadRequestException(
                `Assignment ${assignmentId} is not assigned to this agent`,
            );
        }

        // Validate current status
        if (assignment.status !== ShippingStatus.IN_TRANSIT) {
            throw new BadRequestException(
                `Assignment ${assignmentId} status is ${assignment.status} - can only report failure when IN_TRANSIT`,
            );
        }

        // Update assignment and agent statistics
        const updated = await this.prisma.$transaction(async (tx) => {
            // Update assignment
            const updatedAssignment = await tx.shipping_assignments.update({
                where: { id: assignmentId },
                data: {
                    status: ShippingStatus.FAILED,
                    failureReason,
                    deliveryNotes: notes || assignment.deliveryNotes,
                },
                include: {
                    orders: true,
                    delivery_agents: {
                        include: { users: true },
                    },
                },
            });

            // Update agent statistics (total deliveries but not successful)
            if (assignment.agentId) {
                await tx.delivery_agents.update({
                    where: { id: assignment.agentId },
                    data: {
                        totalDeliveries: { increment: 1 },
                        // Note: successfulDeliveries NOT incremented
                    },
                });
            }

            return updatedAssignment;
        });

        // Create log
        await this.createShippingLog(
            assignmentId,
            ShippingStatus.IN_TRANSIT,
            ShippingStatus.FAILED,
            agentUserId,
            `Delivery failed: ${failureReason}`,
            undefined,
            notes,
        );

        this.logger.error({
            event: 'delivery_failed',
            assignmentId,
            orderId: assignment.orderId,
            orderNumber: assignment.orders.orderNumber,
            agentCode: assignment.delivery_agents?.agentCode,
            failureReason,
            message: 'Delivery marked as FAILED - manual intervention required (terminal state)',
        });

        // Emit shipment.failed event (async, post-commit)
        try {
            await this.eventEmitter.emitAsync('shipment.failed', {
                assignmentId: updated.id,
                orderId: updated.orderId,
                orderNumber: updated.orders.orderNumber,
                agentId: updated.agentId,
                agentCode: updated.delivery_agents?.agentCode,
                failureReason,
                failedAt: new Date().toISOString(),
                notes,
            });
        } catch (error) {
            this.logger.error({
                event: 'event_emission_failed',
                eventType: 'shipment.failed',
                assignmentId,
                error: error.message,
            });
        }

        return updated;
    }

    /**
     * Cancel shipping assignment
     * 
     * Transitions: PENDING/ASSIGNED → CANCELLED
     * Cannot cancel after agent has accepted (ACCEPTED, PICKED_UP, IN_TRANSIT).
     * Terminal state (no transitions out).
     * 
     * @param assignmentId - Shipping assignment ID
     * @param userId - User ID performing cancellation (admin/seller)
     * @param reason - Cancellation reason
     * @returns Updated shipping assignment
     * 
     * @throws NotFoundException if assignment not found
     * @throws BadRequestException if assignment cannot be cancelled (wrong state)
     */
    async cancelAssignment(assignmentId: string, userId: string, reason: string) {
        const assignment = await this.prisma.shipping_assignments.findUnique({
            where: { id: assignmentId },
            include: {
                orders: true,
                delivery_agents: true,
            },
        });

        if (!assignment) {
            throw new NotFoundException(`Shipping assignment ${assignmentId} not found`);
        }

        // Idempotency: Already cancelled
        if (assignment.status === ShippingStatus.CANCELLED) {
            this.logger.warn({
                event: 'assignment_already_cancelled',
                assignmentId,
                userId,
                message: 'Assignment already cancelled (idempotent)',
            });
            return assignment;
        }

        // Validate can be cancelled (only PENDING or ASSIGNED)
        const cancellableStatuses: ShippingStatus[] = [ShippingStatus.PENDING, ShippingStatus.ASSIGNED];
        if (!cancellableStatuses.includes(assignment.status)) {
            throw new BadRequestException(
                `Cannot cancel assignment ${assignmentId} - status is ${assignment.status}. Can only cancel PENDING or ASSIGNED assignments.`,
            );
        }

        const previousStatus = assignment.status;

        // Update assignment
        const updated = await this.prisma.shipping_assignments.update({
            where: { id: assignmentId },
            data: {
                status: ShippingStatus.CANCELLED,
                deliveryNotes: reason,
            },
            include: {
                orders: true,
                delivery_agents: true,
            },
        });

        // Create log
        await this.createShippingLog(
            assignmentId,
            previousStatus,
            ShippingStatus.CANCELLED,
            userId,
            `Assignment cancelled: ${reason}`,
        );

        this.logger.log({
            event: 'assignment_cancelled',
            assignmentId,
            orderId: assignment.orderId,
            orderNumber: assignment.orders.orderNumber,
            previousStatus,
            reason,
            cancelledBy: userId,
        });

        return updated;
    }

    /**
     * Get assignment by ID with full details
     * 
     * @param assignmentId - Shipping assignment ID
     * @returns Shipping assignment with order, agent, and logs
     * 
     * @throws NotFoundException if assignment not found
     */
    async getAssignment(assignmentId: string) {
        const assignment = await this.prisma.shipping_assignments.findUnique({
            where: { id: assignmentId },
            include: {
                orders: {
                    include: {
                        users: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                                phone: true,
                            },
                        },
                        order_items: {
                            include: {
                                products: {
                                    select: {
                                        id: true,
                                        name: true,
                                        images: true,
                                    },
                                },
                            },
                        },
                    },
                },
                delivery_agents: {
                    include: {
                        users: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                                phone: true,
                            },
                        },
                    },
                },
                shipping_logs: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!assignment) {
            throw new NotFoundException(`Shipping assignment ${assignmentId} not found`);
        }

        return assignment;
    }

    /**
     * Get all assignments for a specific agent
     * 
     * @param agentUserId - Agent's user ID
     * @param status - Optional status filter
     * @returns List of shipping assignments
     */
    async getAgentAssignments(agentUserId: string, status?: ShippingStatus) {
        // Get agent by user ID
        const agent = await this.prisma.delivery_agents.findUnique({
            where: { userId: agentUserId },
        });

        if (!agent) {
            throw new NotFoundException(`Delivery agent not found for user ${agentUserId}`);
        }

        const where: Prisma.shipping_assignmentsWhereInput = {
            agentId: agent.id,
        };

        if (status) {
            where.status = status;
        }

        return this.prisma.shipping_assignments.findMany({
            where,
            include: {
                orders: {
                    select: {
                        id: true,
                        orderNumber: true,
                        deliveryAddress: true,
                        deliveryCity: true,
                        deliveryZipCode: true,
                        deliveryPhone: true,
                        totalCost: true,
                        users: {
                            select: {
                                firstName: true,
                                lastName: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
            orderBy: { assignedAt: 'desc' },
        });
    }

    /**
     * Get shipping history for an order
     * 
     * @param orderId - Order ID
     * @returns List of shipping assignments (including cancelled/failed)
     */
    async getOrderShippingHistory(orderId: string) {
        return this.prisma.shipping_assignments.findMany({
            where: { orderId },
            include: {
                delivery_agents: {
                    select: {
                        agentCode: true,
                        users: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
                shipping_logs: {
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { assignedAt: 'desc' },
        });
    }

    // ========================
    // PRIVATE HELPER METHODS
    // ========================

    /**
     * Validate state transition
     * 
     * Enforces approved state machine strictly.
     * 
     * @param fromStatus - Current status
     * @param toStatus - Target status
     * @throws BadRequestException if transition not allowed
     */
    private validateStateTransition(fromStatus: ShippingStatus, toStatus: ShippingStatus): void {
        const allowedTransitions = this.ALLOWED_TRANSITIONS[fromStatus];

        if (!allowedTransitions.includes(toStatus)) {
            throw new BadRequestException(
                `Invalid state transition: ${fromStatus} → ${toStatus}. Allowed transitions from ${fromStatus}: ${allowedTransitions.join(', ') || 'none (terminal state)'}`,
            );
        }
    }

    /**
     * Create shipping log entry
     * 
     * All state transitions MUST create a log entry for audit trail.
     * 
     * @param assignmentId - Shipping assignment ID
     * @param fromStatus - Previous status (null for initial creation)
     * @param toStatus - New status
     * @param changedBy - User ID or 'system'
     * @param notes - Optional notes
     * @param location - Optional location
     * @param additionalNotes - Optional additional context
     */
    private async createShippingLog(
        assignmentId: string,
        fromStatus: ShippingStatus | null,
        toStatus: ShippingStatus,
        changedBy: string,
        notes?: string,
        tx?: Prisma.TransactionClient,
        location?: string,
        additionalNotes?: string,
    ): Promise<void> {
        const prismaClient = tx || this.prisma;
        await prismaClient.shipping_logs.create({
            data: {
                id: crypto.randomUUID(),
                assignmentId,
                fromStatus,
                toStatus,
                changedBy,
                notes: notes || additionalNotes,
                location,
            },
        });
    }
}



