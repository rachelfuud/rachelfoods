import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryAgentDto } from './dto/create-delivery-agent.dto';
import { UpdateDeliveryAgentDto } from './dto/update-delivery-agent.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class DeliveryAgentService {
    constructor(private prisma: PrismaService) { }

    /**
     * Generate unique agent code
     */
    private async generateAgentCode(): Promise<string> {
        const count = await this.prisma.delivery_agents.count();
        return `DA-${String(count + 1).padStart(4, '0')}`;
    }

    /**
     * Create a new delivery agent
     */
    async create(createDto: CreateDeliveryAgentDto) {
        // Check if user already has a delivery agent profile
        const existingAgent = await this.prisma.delivery_agents.findUnique({
            where: { userId: createDto.userId },
        });

        if (existingAgent) {
            throw new ConflictException('User already has a delivery agent profile');
        }

        // Verify user exists
        const user = await this.prisma.users.findUnique({
            where: { id: createDto.userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Generate agent code
        const agentCode = await this.generateAgentCode();

        // Create delivery agent
        const agent = await this.prisma.delivery_agents.create({
            data: {
                id: crypto.randomUUID(),
                userId: createDto.userId,
                agentCode,
                vehicleType: createDto.vehicleType,
                vehicleNumber: createDto.vehicleNumber,
                licenseNumber: createDto.licenseNumber,
                serviceZipCodes: createDto.serviceZipCodes || [],
                maxDeliveryDistance: createDto.maxDeliveryDistance
                    ? new Decimal(createDto.maxDeliveryDistance)
                    : null,
                isAvailable: createDto.isAvailable ?? true,
                updatedAt: new Date(),
            },
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
        });

        return agent;
    }

    /**
     * Find all delivery agents
     */
    async findAll(filters?: any) {
        const where: any = {};

        if (filters?.isAvailable !== undefined) {
            where.isAvailable = filters.isAvailable === 'true';
        }

        if (filters?.status) {
            where.status = filters.status;
        }

        if (filters?.zipCode) {
            where.serviceZipCodes = {
                has: filters.zipCode,
            };
        }

        return this.prisma.delivery_agents.findMany({
            where,
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
                _count: {
                    select: {
                        shipping_assignments: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find delivery agent by ID
     */
    async findOne(id: string) {
        const agent = await this.prisma.delivery_agents.findUnique({
            where: { id },
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
                shipping_assignments: {
                    include: {
                        orders: {
                            select: {
                                id: true,
                                orderNumber: true,
                                deliveryAddress: true,
                                deliveryCity: true,
                                deliveryZipCode: true,
                                totalCost: true,
                                status: true,
                            },
                        },
                    },
                    orderBy: { assignedAt: 'desc' },
                    take: 10,
                },
                _count: {
                    select: {
                        shipping_assignments: true,
                    },
                },
            },
        });

        if (!agent) {
            throw new NotFoundException(`Delivery agent with id '${id}' not found`);
        }

        return agent;
    }

    /**
     * Find delivery agent by user ID
     */
    async findByUserId(userId: string) {
        const agent = await this.prisma.delivery_agents.findUnique({
            where: { userId },
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
                shipping_assignments: {
                    where: {
                        status: {
                            in: ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'],
                        },
                    },
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
                                status: true,
                            },
                        },
                    },
                    orderBy: { assignedAt: 'desc' },
                },
            },
        });

        if (!agent) {
            throw new NotFoundException('Delivery agent profile not found for this user');
        }

        return agent;
    }

    /**
     * Update delivery agent
     */
    async update(id: string, updateDto: UpdateDeliveryAgentDto) {
        const agent = await this.prisma.delivery_agents.findUnique({
            where: { id },
        });

        if (!agent) {
            throw new NotFoundException(`Delivery agent with id '${id}' not found`);
        }

        const updateData: any = {};

        if (updateDto.vehicleType !== undefined) {
            updateData.vehicleType = updateDto.vehicleType;
        }

        if (updateDto.vehicleNumber !== undefined) {
            updateData.vehicleNumber = updateDto.vehicleNumber;
        }

        if (updateDto.licenseNumber !== undefined) {
            updateData.licenseNumber = updateDto.licenseNumber;
        }

        if (updateDto.serviceZipCodes !== undefined) {
            updateData.serviceZipCodes = updateDto.serviceZipCodes;
        }

        if (updateDto.maxDeliveryDistance !== undefined) {
            updateData.maxDeliveryDistance = new Decimal(updateDto.maxDeliveryDistance);
        }

        if (updateDto.isAvailable !== undefined) {
            updateData.isAvailable = updateDto.isAvailable;
        }

        if (updateDto.status !== undefined) {
            updateData.status = updateDto.status;
        }

        return this.prisma.delivery_agents.update({
            where: { id },
            data: updateData,
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
        });
    }

    /**
     * Get agent statistics
     */
    async getStatistics(agentId: string) {
        const agent = await this.prisma.delivery_agents.findUnique({
            where: { id: agentId },
        });

        if (!agent) {
            throw new NotFoundException(`Delivery agent with id '${agentId}' not found`);
        }

        const [
            totalAssignments,
            pendingAssignments,
            activeAssignments,
            completedAssignments,
            failedAssignments,
        ] = await Promise.all([
            this.prisma.shipping_assignments.count({
                where: { agentId },
            }),
            this.prisma.shipping_assignments.count({
                where: { agentId, status: 'PENDING' },
            }),
            this.prisma.shipping_assignments.count({
                where: {
                    agentId,
                    status: { in: ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
                },
            }),
            this.prisma.shipping_assignments.count({
                where: { agentId, status: 'DELIVERED' },
            }),
            this.prisma.shipping_assignments.count({
                where: { agentId, status: 'FAILED' },
            }),
        ]);

        const successRate =
            totalAssignments > 0
                ? ((completedAssignments / totalAssignments) * 100).toFixed(2)
                : '0.00';

        return {
            agentCode: agent.agentCode,
            totalAssignments,
            pendingAssignments,
            activeAssignments,
            completedAssignments,
            failedAssignments,
            successRate: `${successRate}%`,
            averageRating: agent.averageRating || null,
            isAvailable: agent.isAvailable,
            status: agent.status,
        };
    }

    /**
     * Get available agents for a zip code
     */
    async getAvailableAgentsForZipCode(zipCode: string) {
        return this.prisma.delivery_agents.findMany({
            where: {
                isAvailable: true,
                status: 'ACTIVE',
                serviceZipCodes: {
                    has: zipCode,
                },
            },
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
                _count: {
                    select: {
                        shipping_assignments: {
                            where: {
                                status: {
                                    in: ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'],
                                },
                            },
                        },
                    },
                },
            },
            orderBy: [{ averageRating: 'desc' }, { totalDeliveries: 'desc' }],
        });
    }

    /**
     * Toggle agent availability
     */
    async toggleAvailability(id: string) {
        const agent = await this.prisma.delivery_agents.findUnique({
            where: { id },
        });

        if (!agent) {
            throw new NotFoundException(`Delivery agent with id '${id}' not found`);
        }

        return this.prisma.delivery_agents.update({
            where: { id },
            data: { isAvailable: !agent.isAvailable },
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
        });
    }
}
