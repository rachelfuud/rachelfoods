import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WithdrawalStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
    RiskSignal,
    RiskSignalType,
    RiskSeverity,
    UserRiskProfile,
    HighRiskUser,
    RiskSignalsSummary,
} from './dto/withdrawal-risk.dto';

@Injectable()
export class WithdrawalRiskService {
    private readonly logger = new Logger(WithdrawalRiskService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Compute comprehensive risk profile for a user
     * READ-ONLY: Analyzes historical withdrawal patterns
     */
    async computeUserRiskProfile(userId: string): Promise<UserRiskProfile> {
        const startTime = Date.now();

        this.logger.log({
            event: 'risk_profile_computation_started',
            userId,
            evaluationMode: 'READ_ONLY',
        });

        // Fetch user's withdrawal history (READ-ONLY)
        const withdrawals = await this.prisma.withdrawals.findMany({
            where: { userId },
            select: {
                id: true,
                status: true,
                requestedAmount: true,
                netAmount: true,
                requestedAt: true,
                completedAt: true,
                failedAt: true,
                rejectedAt: true,
                rejectionReason: true,
                bankAccount: true,
            },
            orderBy: { requestedAt: 'desc' },
        });

        const now = new Date();
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const recent7Days = withdrawals.filter((w) => w.requestedAt >= last7Days);
        const recent30Days = withdrawals.filter((w) => w.requestedAt >= last30Days);

        // Calculate success and failure rates
        const successCount = withdrawals.filter((w) => w.status === 'COMPLETED').length;
        const failureCount = withdrawals.filter(
            (w) => w.status === 'FAILED' || w.status === 'REJECTED',
        ).length;
        const totalCount = withdrawals.length;

        const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 100;
        const failureRate = totalCount > 0 ? (failureCount / totalCount) * 100 : 0;

        // Compute individual risk signals
        const signals: RiskSignal[] = [];

        // Signal 1: Frequency Acceleration
        const frequencySignal = this.computeFrequencyAcceleration(
            withdrawals,
            recent7Days,
            recent30Days,
        );
        if (frequencySignal) signals.push(frequencySignal);

        // Signal 2: High Failure Rate
        const failureSignal = this.computeFailureRateSignal(failureRate, failureCount);
        if (failureSignal) signals.push(failureSignal);

        // Signal 3: Amount Deviation
        const deviationSignal = this.computeAmountDeviation(withdrawals, recent7Days);
        if (deviationSignal) signals.push(deviationSignal);

        // Signal 4: Multiple Bank Accounts
        const bankAccountSignal = this.computeMultipleBankAccounts(withdrawals);
        if (bankAccountSignal) signals.push(bankAccountSignal);

        // Signal 5: Recent Rejections
        const rejectionSignal = this.computeRecentRejections(recent30Days);
        if (rejectionSignal) signals.push(rejectionSignal);

        // Signal 6: Policy Violation Density
        const violationSignal = this.computePolicyViolationDensity(recent30Days);
        if (violationSignal) signals.push(violationSignal);

        // Aggregate overall risk score (weighted average)
        const overallScore = this.aggregateRiskScore(signals);
        const riskLevel = this.determineRiskLevel(overallScore);

        const durationMs = Date.now() - startTime;

        this.logger.log({
            event: 'risk_profile_computed',
            userId,
            riskLevel,
            overallScore,
            activeSignals: signals.length,
            durationMs,
            riskSignalsEvaluated: signals.map((s) => s.signalType),
            riskLevelComputed: riskLevel,
            evaluationContext: {
                totalWithdrawals: totalCount,
                last30DaysWithdrawals: recent30Days.length,
                last7DaysWithdrawals: recent7Days.length,
                successRate: successRate.toFixed(2),
                failureRate: failureRate.toFixed(2),
            },
        });

        return {
            userId,
            riskLevel,
            overallScore,
            activeSignals: signals,
            lastEvaluatedAt: new Date().toISOString(),
            evaluationContext: {
                totalWithdrawals: totalCount,
                last30DaysWithdrawals: recent30Days.length,
                last7DaysWithdrawals: recent7Days.length,
                successRate: parseFloat(successRate.toFixed(2)),
                failureRate: parseFloat(failureRate.toFixed(2)),
            },
        };
    }

    /**
     * Get high-risk users across the platform
     * READ-ONLY: Identifies users with elevated risk profiles
     */
    async getHighRiskUsers(minScore: number = 70, limit: number = 50): Promise<HighRiskUser[]> {
        const startTime = Date.now();

        this.logger.log({
            event: 'high_risk_users_query_started',
            minScore,
            limit,
        });

        // Get all users who have made withdrawals (READ-ONLY)
        const usersWithWithdrawals = await this.prisma.withdrawals.findMany({
            select: {
                userId: true,
            },
            distinct: ['userId'],
        });

        const highRiskUsers: HighRiskUser[] = [];

        // Compute risk profiles for each user
        for (const { userId } of usersWithWithdrawals) {
            const profile = await this.computeUserRiskProfile(userId);

            if (profile.overallScore >= minScore) {
                // Get last withdrawal time (READ-ONLY)
                const lastWithdrawal = await this.prisma.withdrawals.findFirst({
                    where: { userId },
                    orderBy: { requestedAt: 'desc' },
                    select: { requestedAt: true },
                });

                highRiskUsers.push({
                    userId: profile.userId,
                    riskLevel: profile.riskLevel,
                    overallScore: profile.overallScore,
                    topSignals: profile.activeSignals
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 3)
                        .map((s) => ({
                            signalType: s.signalType,
                            severity: s.severity,
                            score: s.score,
                        })),
                    lastWithdrawalAt: lastWithdrawal?.requestedAt.toISOString() || null,
                    totalWithdrawals: profile.evaluationContext.totalWithdrawals,
                });
            }

            // Break if we've reached the limit
            if (highRiskUsers.length >= limit) break;
        }

        // Sort by score descending
        highRiskUsers.sort((a, b) => b.overallScore - a.overallScore);

        const durationMs = Date.now() - startTime;

        this.logger.log({
            event: 'high_risk_users_identified',
            totalUsersScanned: usersWithWithdrawals.length,
            highRiskUsersFound: highRiskUsers.length,
            durationMs,
        });

        return highRiskUsers;
    }

    /**
     * Get platform-wide risk signals summary
     * READ-ONLY: Aggregates risk metrics across all users
     */
    async getRiskSignalsSummary(): Promise<RiskSignalsSummary> {
        const startTime = Date.now();

        this.logger.log({
            event: 'risk_signals_summary_started',
        });

        // Get all users with withdrawals (READ-ONLY)
        const usersWithWithdrawals = await this.prisma.withdrawals.findMany({
            select: {
                userId: true,
            },
            distinct: ['userId'],
        });

        const signalOccurrences = new Map<RiskSignalType, number>();
        const signalSeverities = new Map<RiskSignalType, RiskSeverity[]>();
        let lowRiskCount = 0;
        let mediumRiskCount = 0;
        let highRiskCount = 0;

        // Compute profiles for all users
        for (const { userId } of usersWithWithdrawals) {
            const profile = await this.computeUserRiskProfile(userId);

            // Count risk levels
            if (profile.riskLevel === RiskSeverity.LOW) lowRiskCount++;
            else if (profile.riskLevel === RiskSeverity.MEDIUM) mediumRiskCount++;
            else if (profile.riskLevel === RiskSeverity.HIGH) highRiskCount++;

            // Track signal occurrences
            for (const signal of profile.activeSignals) {
                signalOccurrences.set(
                    signal.signalType,
                    (signalOccurrences.get(signal.signalType) || 0) + 1,
                );

                const severities = signalSeverities.get(signal.signalType) || [];
                severities.push(signal.severity);
                signalSeverities.set(signal.signalType, severities);
            }
        }

        // Build top signals
        const topSignals = Array.from(signalOccurrences.entries())
            .map(([signalType, occurrences]) => {
                const severities = signalSeverities.get(signalType) || [];
                const averageSeverity = this.calculateAverageSeverity(severities);

                return {
                    signalType,
                    occurrences,
                    averageSeverity,
                };
            })
            .sort((a, b) => b.occurrences - a.occurrences);

        const durationMs = Date.now() - startTime;

        this.logger.log({
            event: 'risk_signals_summary_completed',
            totalUsersAnalyzed: usersWithWithdrawals.length,
            highRiskCount,
            durationMs,
        });

        return {
            totalUsersAnalyzed: usersWithWithdrawals.length,
            riskDistribution: {
                low: lowRiskCount,
                medium: mediumRiskCount,
                high: highRiskCount,
            },
            topSignals,
            highRiskUserCount: highRiskCount,
            evaluatedAt: new Date().toISOString(),
        };
    }

    // Private helper methods for signal computation

    private computeFrequencyAcceleration(
        allWithdrawals: any[],
        recent7Days: any[],
        recent30Days: any[],
    ): RiskSignal | null {
        if (allWithdrawals.length < 10) return null; // Not enough data

        const historicalAvgPerWeek = (allWithdrawals.length / 52); // Assume 1 year history
        const recentPerWeek = recent7Days.length;

        if (historicalAvgPerWeek === 0) return null;

        const accelerationRatio = recentPerWeek / historicalAvgPerWeek;

        if (accelerationRatio <= 1.5) return null; // No significant acceleration

        let severity: RiskSeverity;
        let score: number;

        if (accelerationRatio >= 3) {
            severity = RiskSeverity.HIGH;
            score = Math.min(100, 60 + (accelerationRatio - 3) * 10);
        } else if (accelerationRatio >= 2) {
            severity = RiskSeverity.MEDIUM;
            score = 40 + (accelerationRatio - 2) * 20;
        } else {
            severity = RiskSeverity.LOW;
            score = 20 + (accelerationRatio - 1.5) * 40;
        }

        return {
            signalType: RiskSignalType.FREQUENCY_ACCELERATION,
            severity,
            score: Math.round(score),
            explanation: `Withdrawal frequency has increased ${accelerationRatio.toFixed(1)}x compared to historical average (${recentPerWeek} per week vs ${historicalAvgPerWeek.toFixed(1)} per week)`,
            metadata: {
                recentPerWeek,
                historicalAvgPerWeek: parseFloat(historicalAvgPerWeek.toFixed(2)),
                accelerationRatio: parseFloat(accelerationRatio.toFixed(2)),
            },
        };
    }

    private computeFailureRateSignal(
        failureRate: number,
        failureCount: number,
    ): RiskSignal | null {
        if (failureCount < 2) return null; // Not enough failures

        let severity: RiskSeverity;
        let score: number;

        if (failureRate >= 40) {
            severity = RiskSeverity.HIGH;
            score = Math.min(100, 60 + (failureRate - 40));
        } else if (failureRate >= 20) {
            severity = RiskSeverity.MEDIUM;
            score = 40 + (failureRate - 20);
        } else if (failureRate >= 10) {
            severity = RiskSeverity.LOW;
            score = 20 + (failureRate - 10);
        } else {
            return null; // Acceptable failure rate
        }

        return {
            signalType: RiskSignalType.HIGH_FAILURE_RATE,
            severity,
            score: Math.round(score),
            explanation: `High failure rate detected: ${failureRate.toFixed(1)}% of withdrawals failed or were rejected`,
            metadata: {
                failureRate: parseFloat(failureRate.toFixed(2)),
                failureCount,
            },
        };
    }

    private computeAmountDeviation(
        allWithdrawals: any[],
        recent7Days: any[],
    ): RiskSignal | null {
        if (allWithdrawals.length < 5 || recent7Days.length === 0) return null;

        // Calculate historical average
        const historicalAmounts = allWithdrawals
            .filter((w) => !recent7Days.includes(w))
            .map((w) => parseFloat(w.requestedAmount.toString()));

        if (historicalAmounts.length === 0) return null;

        const historicalAvg =
            historicalAmounts.reduce((sum, amt) => sum + amt, 0) / historicalAmounts.length;

        // Calculate recent average
        const recentAmounts = recent7Days.map((w) => parseFloat(w.requestedAmount.toString()));
        const recentAvg = recentAmounts.reduce((sum, amt) => sum + amt, 0) / recentAmounts.length;

        if (historicalAvg === 0) return null;

        const deviationRatio = recentAvg / historicalAvg;

        if (deviationRatio >= 0.5 && deviationRatio <= 2) return null; // Normal range

        let severity: RiskSeverity;
        let score: number;

        if (deviationRatio >= 3 || deviationRatio <= 0.3) {
            severity = RiskSeverity.HIGH;
            score = 70;
        } else if (deviationRatio >= 2 || deviationRatio <= 0.5) {
            severity = RiskSeverity.MEDIUM;
            score = 50;
        } else {
            severity = RiskSeverity.LOW;
            score = 30;
        }

        return {
            signalType: RiskSignalType.AMOUNT_DEVIATION,
            severity,
            score,
            explanation: `Recent withdrawal amounts deviate significantly from historical pattern (${deviationRatio.toFixed(1)}x change)`,
            metadata: {
                historicalAvg: parseFloat(historicalAvg.toFixed(2)),
                recentAvg: parseFloat(recentAvg.toFixed(2)),
                deviationRatio: parseFloat(deviationRatio.toFixed(2)),
            },
        };
    }

    private computeMultipleBankAccounts(withdrawals: any[]): RiskSignal | null {
        const uniqueBankAccounts = new Set(
            withdrawals.map((w) => w.bankAccount).filter((acc) => acc),
        );

        const accountCount = uniqueBankAccounts.size;

        if (accountCount <= 2) return null; // Normal to have 1-2 accounts

        let severity: RiskSeverity;
        let score: number;

        if (accountCount >= 5) {
            severity = RiskSeverity.HIGH;
            score = 70 + Math.min(30, (accountCount - 5) * 5);
        } else if (accountCount >= 4) {
            severity = RiskSeverity.MEDIUM;
            score = 50;
        } else {
            severity = RiskSeverity.LOW;
            score = 30;
        }

        return {
            signalType: RiskSignalType.MULTIPLE_BANK_ACCOUNTS,
            severity,
            score,
            explanation: `User has used ${accountCount} different bank accounts for withdrawals`,
            metadata: {
                uniqueBankAccountCount: accountCount,
            },
        };
    }

    private computeRecentRejections(recent30Days: any[]): RiskSignal | null {
        const rejections = recent30Days.filter((w) => w.status === 'REJECTED');

        if (rejections.length === 0) return null;

        const rejectionRate = (rejections.length / recent30Days.length) * 100;

        let severity: RiskSeverity;
        let score: number;

        if (rejections.length >= 5 || rejectionRate >= 30) {
            severity = RiskSeverity.HIGH;
            score = 80;
        } else if (rejections.length >= 3 || rejectionRate >= 20) {
            severity = RiskSeverity.MEDIUM;
            score = 55;
        } else {
            severity = RiskSeverity.LOW;
            score = 35;
        }

        return {
            signalType: RiskSignalType.RECENT_REJECTIONS,
            severity,
            score,
            explanation: `${rejections.length} withdrawals rejected in last 30 days (${rejectionRate.toFixed(1)}% rejection rate)`,
            metadata: {
                rejectionsLast30Days: rejections.length,
                rejectionRate: parseFloat(rejectionRate.toFixed(2)),
            },
        };
    }

    private computePolicyViolationDensity(recent30Days: any[]): RiskSignal | null {
        const violations = recent30Days.filter(
            (w) =>
                w.status === 'REJECTED' &&
                w.rejectionReason &&
                (w.rejectionReason.includes('limit') ||
                    w.rejectionReason.includes('EXCEEDED') ||
                    w.rejectionReason.includes('policy')),
        );

        if (violations.length === 0) return null;

        const violationRate = (violations.length / recent30Days.length) * 100;

        let severity: RiskSeverity;
        let score: number;

        if (violations.length >= 5 || violationRate >= 40) {
            severity = RiskSeverity.HIGH;
            score = 75;
        } else if (violations.length >= 3 || violationRate >= 25) {
            severity = RiskSeverity.MEDIUM;
            score = 50;
        } else {
            severity = RiskSeverity.LOW;
            score = 30;
        }

        return {
            signalType: RiskSignalType.POLICY_VIOLATION_DENSITY,
            severity,
            score,
            explanation: `${violations.length} policy violations in last 30 days (${violationRate.toFixed(1)}% of attempts)`,
            metadata: {
                violationsLast30Days: violations.length,
                violationRate: parseFloat(violationRate.toFixed(2)),
            },
        };
    }

    private aggregateRiskScore(signals: RiskSignal[]): number {
        if (signals.length === 0) return 0;

        // Weighted average with diminishing returns for multiple signals
        const weights = [1.0, 0.8, 0.6, 0.4, 0.3, 0.2];
        const sortedSignals = signals.sort((a, b) => b.score - a.score);

        let weightedSum = 0;
        let totalWeight = 0;

        sortedSignals.forEach((signal, index) => {
            const weight = weights[index] || 0.1;
            weightedSum += signal.score * weight;
            totalWeight += weight;
        });

        return Math.round(weightedSum / totalWeight);
    }

    private determineRiskLevel(score: number): RiskSeverity {
        if (score >= 70) return RiskSeverity.HIGH;
        if (score >= 40) return RiskSeverity.MEDIUM;
        return RiskSeverity.LOW;
    }

    private calculateAverageSeverity(severities: RiskSeverity[]): RiskSeverity {
        if (severities.length === 0) return RiskSeverity.LOW;

        const severityValues = severities.map((s) => {
            if (s === RiskSeverity.HIGH) return 3;
            if (s === RiskSeverity.MEDIUM) return 2;
            return 1;
        });

        const avg = severityValues.reduce((sum, val) => sum + val, 0) / severityValues.length;

        if (avg >= 2.5) return RiskSeverity.HIGH;
        if (avg >= 1.5) return RiskSeverity.MEDIUM;
        return RiskSeverity.LOW;
    }
}
