import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
    CreateWithdrawalPolicyDto,
    UpdateWithdrawalPolicyDto,
    WithdrawalPolicyResponse,
} from './dto/withdrawal-policy.dto';

@Injectable()
export class WithdrawalPolicyService {
    private readonly logger = new Logger(WithdrawalPolicyService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create a new withdrawal policy
     * Admin-only configuration endpoint
     */
    async createPolicy(dto: CreateWithdrawalPolicyDto): Promise<WithdrawalPolicyResponse> {
        // Validate role is provided for ROLE-scoped policies
        if (dto.scopeType === 'ROLE' && !dto.role) {
            throw new Error('Role must be specified for ROLE-scoped policies');
        }

        // Validate role is not provided for GLOBAL policies
        if (dto.scopeType === 'GLOBAL' && dto.role) {
            throw new Error('Role cannot be specified for GLOBAL-scoped policies');
        }

        // Validate limits make sense
        if (dto.minSingleWithdrawal && dto.maxSingleWithdrawal) {
            if (dto.minSingleWithdrawal > dto.maxSingleWithdrawal) {
                throw new Error('Minimum single withdrawal cannot exceed maximum');
            }
        }

        const policy = await this.prisma.withdrawal_policies.create({
            data: {
                scopeType: dto.scopeType,
                role: dto.role || null,
                currency: dto.currency,
                dailyAmountLimit: dto.dailyAmountLimit
                    ? new Decimal(dto.dailyAmountLimit)
                    : null,
                weeklyAmountLimit: dto.weeklyAmountLimit
                    ? new Decimal(dto.weeklyAmountLimit)
                    : null,
                monthlyAmountLimit: dto.monthlyAmountLimit
                    ? new Decimal(dto.monthlyAmountLimit)
                    : null,
                dailyCountLimit: dto.dailyCountLimit || null,
                weeklyCountLimit: dto.weeklyCountLimit || null,
                monthlyCountLimit: dto.monthlyCountLimit || null,
                maxSingleWithdrawal: dto.maxSingleWithdrawal
                    ? new Decimal(dto.maxSingleWithdrawal)
                    : null,
                minSingleWithdrawal: dto.minSingleWithdrawal
                    ? new Decimal(dto.minSingleWithdrawal)
                    : null,
                enabled: dto.enabled !== undefined ? dto.enabled : true,
            },
        });

        this.logger.log({
            event: 'withdrawal_policy_created',
            policyId: policy.id,
            scopeType: policy.scopeType,
            role: policy.role,
            currency: policy.currency,
        });

        return this.mapToResponse(policy);
    }

    /**
     * Update an existing withdrawal policy
     * Admin-only configuration endpoint
     */
    async updatePolicy(
        id: string,
        dto: UpdateWithdrawalPolicyDto,
    ): Promise<WithdrawalPolicyResponse> {
        // Validate limits make sense
        const existing = await this.prisma.withdrawal_policies.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new Error(`Policy with ID ${id} not found`);
        }

        const newMin = dto.minSingleWithdrawal ?? existing.minSingleWithdrawal?.toNumber();
        const newMax = dto.maxSingleWithdrawal ?? existing.maxSingleWithdrawal?.toNumber();

        if (newMin && newMax && newMin > newMax) {
            throw new Error('Minimum single withdrawal cannot exceed maximum');
        }

        const policy = await this.prisma.withdrawal_policies.update({
            where: { id },
            data: {
                dailyAmountLimit: dto.dailyAmountLimit
                    ? new Decimal(dto.dailyAmountLimit)
                    : undefined,
                weeklyAmountLimit: dto.weeklyAmountLimit
                    ? new Decimal(dto.weeklyAmountLimit)
                    : undefined,
                monthlyAmountLimit: dto.monthlyAmountLimit
                    ? new Decimal(dto.monthlyAmountLimit)
                    : undefined,
                dailyCountLimit: dto.dailyCountLimit,
                weeklyCountLimit: dto.weeklyCountLimit,
                monthlyCountLimit: dto.monthlyCountLimit,
                maxSingleWithdrawal: dto.maxSingleWithdrawal
                    ? new Decimal(dto.maxSingleWithdrawal)
                    : undefined,
                minSingleWithdrawal: dto.minSingleWithdrawal
                    ? new Decimal(dto.minSingleWithdrawal)
                    : undefined,
            },
        });

        this.logger.log({
            event: 'withdrawal_policy_updated',
            policyId: policy.id,
            updatedFields: Object.keys(dto),
        });

        return this.mapToResponse(policy);
    }

    /**
     * Get all withdrawal policies
     * Admin-only read endpoint
     */
    async getAllPolicies(): Promise<WithdrawalPolicyResponse[]> {
        const policies = await this.prisma.withdrawal_policies.findMany({
            orderBy: [{ scopeType: 'asc' }, { role: 'asc' }, { currency: 'asc' }],
        });

        return policies.map((p) => this.mapToResponse(p));
    }

    /**
     * Get a specific policy by ID
     * Admin-only read endpoint
     */
    async getPolicyById(id: string): Promise<WithdrawalPolicyResponse> {
        const policy = await this.prisma.withdrawal_policies.findUnique({
            where: { id },
        });

        if (!policy) {
            throw new Error(`Policy with ID ${id} not found`);
        }

        return this.mapToResponse(policy);
    }

    /**
     * Enable a policy
     * Admin-only configuration endpoint
     */
    async enablePolicy(id: string): Promise<WithdrawalPolicyResponse> {
        const policy = await this.prisma.withdrawal_policies.update({
            where: { id },
            data: { enabled: true },
        });

        this.logger.log({
            event: 'withdrawal_policy_enabled',
            policyId: policy.id,
        });

        return this.mapToResponse(policy);
    }

    /**
     * Disable a policy
     * Admin-only configuration endpoint
     */
    async disablePolicy(id: string): Promise<WithdrawalPolicyResponse> {
        const policy = await this.prisma.withdrawal_policies.update({
            where: { id },
            data: { enabled: false },
        });

        this.logger.log({
            event: 'withdrawal_policy_disabled',
            policyId: policy.id,
        });

        return this.mapToResponse(policy);
    }

    // Private helper method
    private mapToResponse(policy: any): WithdrawalPolicyResponse {
        return {
            id: policy.id,
            scopeType: policy.scopeType,
            role: policy.role,
            currency: policy.currency,
            dailyAmountLimit: policy.dailyAmountLimit?.toString() || null,
            weeklyAmountLimit: policy.weeklyAmountLimit?.toString() || null,
            monthlyAmountLimit: policy.monthlyAmountLimit?.toString() || null,
            dailyCountLimit: policy.dailyCountLimit,
            weeklyCountLimit: policy.weeklyCountLimit,
            monthlyCountLimit: policy.monthlyCountLimit,
            maxSingleWithdrawal: policy.maxSingleWithdrawal?.toString() || null,
            minSingleWithdrawal: policy.minSingleWithdrawal?.toString() || null,
            enabled: policy.enabled,
            createdAt: policy.createdAt.toISOString(),
            updatedAt: policy.updatedAt.toISOString(),
        };
    }
}
