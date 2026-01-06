import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WithdrawalStatus } from '@prisma/client';
import { WithdrawalLimitEvaluatorService } from './withdrawal-limit-evaluator.service';
import { SimulateWithdrawalDto, SimulationResult } from './dto/policy-insights.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WithdrawalPolicySimulationService {
    private readonly logger = new Logger(WithdrawalPolicySimulationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly limitEvaluator: WithdrawalLimitEvaluatorService,
    ) { }

    /**
     * Simulate withdrawal evaluation without creating any records
     * READ-ONLY: Tests policy enforcement logic with current limits
     */
    async simulateWithdrawal(dto: SimulateWithdrawalDto): Promise<SimulationResult> {
        const startTime = Date.now();

        this.logger.log({
            event: 'withdrawal_simulation_started',
            userId: dto.userId,
            walletId: dto.walletId,
            amount: dto.amount,
            currency: dto.currency,
            providedRole: dto.userRole || 'not_specified',
        });

        // Validate user exists (READ-ONLY check)
        const user = await this.prisma.users.findUnique({
            where: { id: dto.userId },
            select: {
                id: true,
            },
        });

        if (!user) {
            throw new NotFoundException(`User ${dto.userId} not found`);
        }

        // Validate wallet exists and belongs to user (READ-ONLY check)
        const wallet = await this.prisma.wallets.findUnique({
            where: { id: dto.walletId },
            select: {
                id: true,
                userId: true,
                currency: true,
            },
        });

        if (!wallet) {
            throw new NotFoundException(`Wallet ${dto.walletId} not found`);
        }

        if (wallet.userId !== dto.userId) {
            throw new NotFoundException(`Wallet ${dto.walletId} does not belong to user ${dto.userId}`);
        }

        // Validate currency matches
        if (wallet.currency !== dto.currency) {
            throw new Error(
                `Currency mismatch: wallet is ${wallet.currency}, requested ${dto.currency}`,
            );
        }

        // Use provided role (users table doesn't have role field yet)
        const effectiveRole = dto.userRole || 'SELLER'; // Default to SELLER

        // Call limit evaluator (READ-ONLY evaluation)
        const evaluation = await this.limitEvaluator.evaluateWithdrawalRequest(
            dto.userId,
            dto.walletId,
            new Decimal(dto.amount),
            dto.currency,
            effectiveRole,
        );

        // Calculate current user metrics (READ-ONLY aggregation)
        const userMetrics = await this.calculateUserMetrics(
            dto.userId,
            dto.walletId,
            dto.currency,
        );

        const durationMs = Date.now() - startTime;

        this.logger.log({
            event: 'withdrawal_simulation_completed',
            userId: dto.userId,
            allowed: evaluation.allowed,
            violationCount: evaluation.violations.length,
            policyApplied: evaluation.policyApplied?.policyId || 'none',
            durationMs,
            evaluationMode: 'SIMULATION',
        });

        return {
            allowed: evaluation.allowed,
            evaluationMode: 'SIMULATION',
            violations: evaluation.violations.map((v) => ({
                violationType: v.violationType,
                message: v.message,
                currentValue: v.currentValue,
                limitValue: v.limitValue,
            })),
            policyApplied: evaluation.policyApplied
                ? {
                    policyId: evaluation.policyApplied.policyId,
                    scopeType: evaluation.policyApplied.scopeType,
                    role: evaluation.policyApplied.role,
                    currency: evaluation.policyApplied.currency,
                }
                : null,
            userMetrics,
            simulatedAt: new Date().toISOString(),
        };
    }

    /**
     * Calculate current user metrics (READ-ONLY)
     * Shows user's current withdrawal patterns
     */
    private async calculateUserMetrics(
        userId: string,
        walletId: string,
        currency: string,
    ): Promise<SimulationResult['userMetrics']> {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const statuses: WithdrawalStatus[] = [
            WithdrawalStatus.REQUESTED,
            WithdrawalStatus.APPROVED,
            WithdrawalStatus.PROCESSING,
            WithdrawalStatus.COMPLETED,
        ];

        // Query withdrawals for each time window in parallel (READ-ONLY)
        // Note: withdrawals table doesn't have currency field, filter by walletId only
        const [daily, weekly, monthly] = await Promise.all([
            this.prisma.withdrawals.findMany({
                where: {
                    userId,
                    walletId,
                    status: { in: statuses },
                    requestedAt: { gte: last24h },
                },
                select: {
                    netAmount: true,
                },
            }),
            this.prisma.withdrawals.findMany({
                where: {
                    userId,
                    walletId,
                    status: { in: statuses },
                    requestedAt: { gte: last7d },
                },
                select: {
                    netAmount: true,
                },
            }),
            this.prisma.withdrawals.findMany({
                where: {
                    userId,
                    walletId,
                    status: { in: statuses },
                    requestedAt: { gte: last30d },
                },
                select: {
                    netAmount: true,
                },
            }),
        ]);

        // Calculate totals (READ-ONLY aggregation)
        const dailyAmount = daily.reduce(
            (sum, w) => sum.add(w.netAmount),
            new Decimal(0),
        );
        const weeklyAmount = weekly.reduce(
            (sum, w) => sum.add(w.netAmount),
            new Decimal(0),
        );
        const monthlyAmount = monthly.reduce(
            (sum, w) => sum.add(w.netAmount),
            new Decimal(0),
        );

        return {
            dailyCount: daily.length,
            weeklyCount: weekly.length,
            monthlyCount: monthly.length,
            dailyAmount: dailyAmount.toFixed(2),
            weeklyAmount: weeklyAmount.toFixed(2),
            monthlyAmount: monthlyAmount.toFixed(2),
        };
    }
}
