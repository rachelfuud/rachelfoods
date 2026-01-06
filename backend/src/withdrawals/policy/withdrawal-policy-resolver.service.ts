import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { EffectivePolicy } from './dto/withdrawal-policy.dto';

@Injectable()
export class WithdrawalPolicyResolverService {
    private readonly logger = new Logger(WithdrawalPolicyResolverService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Resolve the effective policy for a user
     * Role-specific policy overrides global policy
     * READ-ONLY: No mutations
     */
    async resolvePolicy(userRole: string | null, currency: string): Promise<EffectivePolicy | null> {
        // Fetch both global and role-specific policies
        const [globalPolicy, rolePolicy] = await Promise.all([
            this.prisma.withdrawal_policies.findFirst({
                where: {
                    scopeType: 'GLOBAL',
                    currency,
                    enabled: true,
                },
            }),
            userRole
                ? this.prisma.withdrawal_policies.findFirst({
                    where: {
                        scopeType: 'ROLE',
                        role: userRole,
                        currency,
                        enabled: true,
                    },
                })
                : null,
        ]);

        // Apply policy resolution logic
        const effectivePolicy = this.resolveEffectivePolicy(globalPolicy, rolePolicy);

        if (effectivePolicy) {
            this.logger.debug({
                event: 'policy_resolved',
                userRole,
                currency,
                resolvedPolicyId: effectivePolicy.policyId,
                scopeType: effectivePolicy.scopeType,
            });
        }

        return effectivePolicy;
    }

    /**
     * Resolve effective policy from global and role policies
     * Role policy overrides global policy
     * READ-ONLY logic
     */
    resolveEffectivePolicy(
        globalPolicy: any | null,
        rolePolicy: any | null,
    ): EffectivePolicy | null {
        // Role policy takes precedence
        if (rolePolicy) {
            return this.mapToEffectivePolicy(rolePolicy);
        }

        // Fall back to global policy
        if (globalPolicy) {
            return this.mapToEffectivePolicy(globalPolicy);
        }

        // No applicable policy
        return null;
    }

    // Private helper method
    private mapToEffectivePolicy(policy: any): EffectivePolicy {
        return {
            policyId: policy.id,
            scopeType: policy.scopeType,
            role: policy.role,
            currency: policy.currency,
            dailyAmountLimit: policy.dailyAmountLimit?.toNumber() || null,
            weeklyAmountLimit: policy.weeklyAmountLimit?.toNumber() || null,
            monthlyAmountLimit: policy.monthlyAmountLimit?.toNumber() || null,
            dailyCountLimit: policy.dailyCountLimit,
            weeklyCountLimit: policy.weeklyCountLimit,
            monthlyCountLimit: policy.monthlyCountLimit,
            maxSingleWithdrawal: policy.maxSingleWithdrawal?.toNumber() || null,
            minSingleWithdrawal: policy.minSingleWithdrawal?.toNumber() || null,
        };
    }
}
