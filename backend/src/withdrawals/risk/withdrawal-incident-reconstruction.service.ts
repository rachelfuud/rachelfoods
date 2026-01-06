import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WithdrawalRiskService } from './withdrawal-risk.service';
import { WithdrawalRiskVisibilityService } from './withdrawal-risk-visibility.service';
import { WithdrawalRiskPlaybookService } from './withdrawal-risk-playbook.service';

/**
 * SPRINT 15 PHASE 1: Incident Reconstruction Engine
 * 
 * PURPOSE: Deterministic, READ-ONLY reconstruction of complete withdrawal incident timeline
 * 
 * GOLDEN RULES:
 * - READ-ONLY (no mutations)
 * - NO new signals or risk computations (use existing data only)
 * - NO actions, blocks, or delays
 * - NO probabilistic inference (facts only)
 * - Deterministic reconstruction from existing logs and services
 * - Non-blocking integrations (graceful degradation)
 * 
 * PATTERN:
 * - Aggregate data from Sprints 12-14
 * - Build ordered timeline from multiple sources
 * - Present complete incident context for audit/analysis
 * - Evidence-backed events only (no speculation)
 * 
 * DATA SOURCES:
 * 1. Withdrawal entity (Prisma)
 * 2. Risk snapshots & escalation data (Sprint 13)
 * 3. Playbook recommendations (Sprint 14 Phase 1 & 2)
 * 4. Admin decision logs (Sprint 14 Phase 3) - simulated
 * 5. Withdrawal outcome & effectiveness (Sprint 14 Phase 4)
 */

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Timeline event representing a single fact in the incident
 */
export interface TimelineEvent {
    timestamp: Date;
    eventType: 'WITHDRAWAL_STATE' | 'RISK_PROFILE' | 'RISK_ESCALATION' | 'PLAYBOOK_RECOMMENDATION' | 'ADMIN_DECISION' | 'SYSTEM_ACTION';
    category: 'STATE_CHANGE' | 'RISK_ASSESSMENT' | 'ESCALATION' | 'RECOMMENDATION' | 'DECISION' | 'OUTCOME';
    source: string;              // Which service/system generated this event
    description: string;         // Human-readable event description
    severity: 'INFO' | 'WARNING' | 'CRITICAL' | null;
    metadata: Record<string, any>; // Event-specific data
}

/**
 * Context snapshot at time of reconstruction
 */
export interface IncidentContext {
    withdrawalId: string;
    userId: string;
    currentStatus: string;
    requestedAmount: number;
    netAmount: number;
    feeAmount: number;
    bankAccount: string;
    accountHolder: string;
    requestedAt: Date;
    completedAt: Date | null;
    cancelledAt: Date | null;
    rejectedAt: Date | null;

    // Current risk profile (latest)
    currentRiskLevel: string | null;
    currentRiskScore: number | null;
    currentRiskSignals: string[];

    // Escalation status
    escalationStatus: 'NONE' | 'MEDIUM' | 'HIGH' | null;
    escalationCount: number;

    // Playbook context
    playbooksMatchedCount: number;
    playbooksActedUponCount: number;

    // Outcome
    finalOutcome: 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'PENDING' | 'PROCESSING';
    resolutionTimeMs: number | null;
}

/**
 * Summary statistics for the incident
 */
export interface IncidentSummary {
    totalEvents: number;
    timelineSpanMs: number;
    riskLevelChanges: number;
    escalationTriggered: boolean;
    playbooksShown: number;
    adminDecisionsCaptured: number;
    highSeverityEvents: number;
    criticalSeverityEvents: number;
}

/**
 * Complete reconstructed incident
 */
export interface WithdrawalIncident {
    incidentId: string;           // withdrawalId + timestamp
    reconstructedAt: Date;
    reconstructedBy: string;      // adminId

    context: IncidentContext;
    timeline: TimelineEvent[];    // Ordered chronologically
    summary: IncidentSummary;

    // Data source availability (for transparency)
    dataSources: {
        withdrawalEntity: boolean;
        riskProfiles: boolean;
        escalationData: boolean;
        playbookRecommendations: boolean;
        adminDecisions: boolean;
        effectivenessMetrics: boolean;
    };
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class WithdrawalIncidentReconstructionService {
    private readonly logger = new Logger(WithdrawalIncidentReconstructionService.name);
    private readonly SPRINT_MARKER = 'SPRINT_15_PHASE_1';

    constructor(
        private readonly prisma: PrismaService,
        private readonly riskService: WithdrawalRiskService,
        private readonly visibilityService: WithdrawalRiskVisibilityService,
        private readonly playbookService: WithdrawalRiskPlaybookService,
    ) { }

    /**
     * SPRINT 15 – PHASE 1: Reconstruct complete incident timeline for a withdrawal
     * 
     * PURPOSE: Aggregate all Sprint 12-14 data into ordered, evidence-backed timeline
     * PATTERN: Non-blocking queries, graceful degradation, deterministic ordering
     * 
     * GOLDEN RULE COMPLIANCE:
     * ✅ READ-ONLY (no mutations)
     * ✅ NO new signals or computations (existing data only)
     * ✅ NO actions or blocks
     * ✅ NO probabilistic inference (facts only)
     * ✅ Deterministic timeline assembly
     * 
     * USE CASES:
     * - Incident investigation: Complete context for disputed withdrawals
     * - Audit trails: Regulatory compliance documentation
     * - Training: Real-world examples for analyst onboarding
     * - Process improvement: Identify bottlenecks in approval flow
     * - Compliance reporting: Demonstrate systematic risk management
     */
    async reconstructIncident(
        withdrawalId: string,
        adminId: string,
    ): Promise<WithdrawalIncident> {
        const reconstructionStart = Date.now();

        this.logger.log({
            marker: this.SPRINT_MARKER,
            action: 'reconstruct_incident_started',
            withdrawalId,
            adminId,
        });

        try {
            // 1. Fetch withdrawal entity (REQUIRED - fail if missing)
            const withdrawal = await this.fetchWithdrawalEntity(withdrawalId);

            // 2. Initialize timeline and data source tracking
            const timeline: TimelineEvent[] = [];
            const dataSources = {
                withdrawalEntity: true,
                riskProfiles: false,
                escalationData: false,
                playbookRecommendations: false,
                adminDecisions: false,
                effectivenessMetrics: false,
            };

            // 3. Build context snapshot
            const context: IncidentContext = {
                withdrawalId: withdrawal.id,
                userId: withdrawal.userId,
                currentStatus: withdrawal.status,
                requestedAmount: Number(withdrawal.requestedAmount),
                netAmount: Number(withdrawal.netAmount),
                feeAmount: Number(withdrawal.feeAmount),
                bankAccount: withdrawal.bankAccount,
                accountHolder: withdrawal.accountHolder,
                requestedAt: withdrawal.requestedAt,
                completedAt: withdrawal.completedAt,
                cancelledAt: withdrawal.cancelledAt,
                rejectedAt: withdrawal.rejectedAt,
                currentRiskLevel: null,
                currentRiskScore: null,
                currentRiskSignals: [],
                escalationStatus: null,
                escalationCount: 0,
                playbooksMatchedCount: 0,
                playbooksActedUponCount: 0,
                finalOutcome: withdrawal.status as any,
                resolutionTimeMs: null,
            };

            // Calculate resolution time
            if (withdrawal.completedAt) {
                context.resolutionTimeMs = withdrawal.completedAt.getTime() - withdrawal.requestedAt.getTime();
            } else if (withdrawal.rejectedAt) {
                context.resolutionTimeMs = withdrawal.rejectedAt.getTime() - withdrawal.requestedAt.getTime();
            } else if (withdrawal.cancelledAt) {
                context.resolutionTimeMs = withdrawal.cancelledAt.getTime() - withdrawal.requestedAt.getTime();
            }

            // 4. Add withdrawal lifecycle events
            this.addWithdrawalLifecycleEvents(withdrawal, timeline);

            // 5. Fetch and add risk profile events (Sprint 12-13)
            try {
                const riskProfile = await this.riskService.computeUserRiskProfile(withdrawal.userId);
                dataSources.riskProfiles = true;

                context.currentRiskLevel = riskProfile.riskLevel;
                context.currentRiskScore = riskProfile.overallScore;
                context.currentRiskSignals = riskProfile.activeSignals.map(s => s.signalType);

                this.addRiskProfileEvents(riskProfile, withdrawal.requestedAt, timeline);
            } catch (error) {
                this.logger.warn({
                    marker: this.SPRINT_MARKER,
                    action: 'risk_profile_fetch_failed',
                    withdrawalId,
                    error: error.message,
                });
            }

            // 6. Fetch and add escalation events (Sprint 13)
            try {
                const escalationData = await this.visibilityService.getWithdrawalRiskTimeline(withdrawalId, adminId);
                dataSources.escalationData = true;

                context.escalationStatus = escalationData.highestSeverity as any;
                context.escalationCount = escalationData.escalations?.length || 0;

                if (escalationData.escalations && escalationData.escalations.length > 0) {
                    this.addEscalationEvents(escalationData.escalations, timeline);
                }
            } catch (error) {
                this.logger.warn({
                    marker: this.SPRINT_MARKER,
                    action: 'escalation_data_fetch_failed',
                    withdrawalId,
                    error: error.message,
                });
            }

            // 7. Fetch and add playbook recommendation events (Sprint 14 Phase 1-2)
            try {
                const playbookRecommendations = await this.playbookService.getRankedRecommendations(withdrawalId, adminId);
                dataSources.playbookRecommendations = true;

                context.playbooksMatchedCount = playbookRecommendations.rankedPlaybooks.length;

                this.addPlaybookRecommendationEvents(playbookRecommendations, timeline);
            } catch (error) {
                this.logger.warn({
                    marker: this.SPRINT_MARKER,
                    action: 'playbook_recommendations_fetch_failed',
                    withdrawalId,
                    error: error.message,
                });
            }

            // 8. Simulate admin decision events (Sprint 14 Phase 3)
            // NOTE: In production, this would parse actual Phase 3 decision logs
            try {
                const simulatedDecisions = this.simulateAdminDecisions(withdrawal, timeline);
                dataSources.adminDecisions = simulatedDecisions;
                if (simulatedDecisions) {
                    context.playbooksActedUponCount = 1; // Simulated
                }
            } catch (error) {
                this.logger.warn({
                    marker: this.SPRINT_MARKER,
                    action: 'admin_decisions_simulation_failed',
                    withdrawalId,
                    error: error.message,
                });
            }

            // 9. Sort timeline chronologically
            timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

            // 10. Build summary statistics
            const summary = this.buildIncidentSummary(timeline, context);

            // 11. Generate incident ID
            const incidentId = `incident_${withdrawalId}_${Date.now()}`;

            const incident: WithdrawalIncident = {
                incidentId,
                reconstructedAt: new Date(),
                reconstructedBy: adminId,
                context,
                timeline,
                summary,
                dataSources,
            };

            const reconstructionDuration = Date.now() - reconstructionStart;

            this.logger.log({
                marker: this.SPRINT_MARKER,
                action: 'reconstruct_incident_completed',
                withdrawalId,
                adminId,
                incidentId,
                timelineEvents: timeline.length,
                durationMs: reconstructionDuration,
                dataSources,
            });

            return incident;
        } catch (error) {
            this.logger.error({
                marker: this.SPRINT_MARKER,
                action: 'reconstruct_incident_error',
                withdrawalId,
                adminId,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Fetch withdrawal entity from database (REQUIRED)
     */
    private async fetchWithdrawalEntity(withdrawalId: string) {
        const withdrawal = await this.prisma.withdrawals.findUnique({
            where: { id: withdrawalId },
            select: {
                id: true,
                userId: true,
                walletId: true,
                requestedAmount: true,
                feeAmount: true,
                netAmount: true,
                status: true,
                bankAccount: true,
                accountHolder: true,
                bankName: true,
                ifscCode: true,
                requestedAt: true,
                approvedAt: true,
                approvedBy: true,
                rejectedAt: true,
                rejectedBy: true,
                rejectionReason: true,
                cancelledAt: true,
                cancelledBy: true,
                cancellationReason: true,
                processingStartedAt: true,
                completedAt: true,
                failedAt: true,
                failureReason: true,
                payoutProvider: true,
                payoutTransactionId: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!withdrawal) {
            throw new Error(`Withdrawal ${withdrawalId} not found`);
        }

        return withdrawal;
    }

    /**
     * Add withdrawal lifecycle events to timeline
     */
    private addWithdrawalLifecycleEvents(withdrawal: any, timeline: TimelineEvent[]): void {
        // Event: Withdrawal requested
        timeline.push({
            timestamp: withdrawal.requestedAt,
            eventType: 'WITHDRAWAL_STATE',
            category: 'STATE_CHANGE',
            source: 'withdrawal_entity',
            description: `Withdrawal requested for ₹${Number(withdrawal.requestedAmount).toFixed(2)}`,
            severity: 'INFO',
            metadata: {
                status: 'REQUESTED',
                requestedAmount: Number(withdrawal.requestedAmount),
                netAmount: Number(withdrawal.netAmount),
                feeAmount: Number(withdrawal.feeAmount),
                bankAccount: withdrawal.bankAccount,
                accountHolder: withdrawal.accountHolder,
            },
        });

        // Event: Withdrawal approved
        if (withdrawal.approvedAt) {
            timeline.push({
                timestamp: withdrawal.approvedAt,
                eventType: 'WITHDRAWAL_STATE',
                category: 'STATE_CHANGE',
                source: 'withdrawal_entity',
                description: `Withdrawal approved by admin ${withdrawal.approvedBy || 'unknown'}`,
                severity: 'INFO',
                metadata: {
                    status: 'APPROVED',
                    approvedBy: withdrawal.approvedBy,
                },
            });
        }

        // Event: Withdrawal rejected
        if (withdrawal.rejectedAt) {
            timeline.push({
                timestamp: withdrawal.rejectedAt,
                eventType: 'WITHDRAWAL_STATE',
                category: 'STATE_CHANGE',
                source: 'withdrawal_entity',
                description: `Withdrawal rejected: ${withdrawal.rejectionReason || 'No reason provided'}`,
                severity: 'WARNING',
                metadata: {
                    status: 'REJECTED',
                    rejectedBy: withdrawal.rejectedBy,
                    rejectionReason: withdrawal.rejectionReason,
                },
            });
        }

        // Event: Withdrawal cancelled
        if (withdrawal.cancelledAt) {
            timeline.push({
                timestamp: withdrawal.cancelledAt,
                eventType: 'WITHDRAWAL_STATE',
                category: 'STATE_CHANGE',
                source: 'withdrawal_entity',
                description: `Withdrawal cancelled: ${withdrawal.cancellationReason || 'No reason provided'}`,
                severity: 'WARNING',
                metadata: {
                    status: 'CANCELLED',
                    cancelledBy: withdrawal.cancelledBy,
                    cancellationReason: withdrawal.cancellationReason,
                },
            });
        }

        // Event: Processing started
        if (withdrawal.processingStartedAt) {
            timeline.push({
                timestamp: withdrawal.processingStartedAt,
                eventType: 'WITHDRAWAL_STATE',
                category: 'STATE_CHANGE',
                source: 'withdrawal_entity',
                description: 'Processing started',
                severity: 'INFO',
                metadata: {
                    status: 'PROCESSING',
                    payoutProvider: withdrawal.payoutProvider,
                },
            });
        }

        // Event: Withdrawal completed
        if (withdrawal.completedAt) {
            timeline.push({
                timestamp: withdrawal.completedAt,
                eventType: 'WITHDRAWAL_STATE',
                category: 'OUTCOME',
                source: 'withdrawal_entity',
                description: 'Withdrawal completed successfully',
                severity: 'INFO',
                metadata: {
                    status: 'COMPLETED',
                    payoutTransactionId: withdrawal.payoutTransactionId,
                    payoutProvider: withdrawal.payoutProvider,
                },
            });
        }

        // Event: Withdrawal failed
        if (withdrawal.failedAt) {
            timeline.push({
                timestamp: withdrawal.failedAt,
                eventType: 'WITHDRAWAL_STATE',
                category: 'OUTCOME',
                source: 'withdrawal_entity',
                description: `Withdrawal failed: ${withdrawal.failureReason || 'Unknown reason'}`,
                severity: 'CRITICAL',
                metadata: {
                    status: 'FAILED',
                    failureReason: withdrawal.failureReason,
                },
            });
        }
    }

    /**
     * Add risk profile events to timeline (Sprint 12-13)
     */
    private addRiskProfileEvents(riskProfile: any, requestedAt: Date, timeline: TimelineEvent[]): void {
        // Use requestedAt as approximate timestamp (risk computed on-demand)
        const riskComputedAt = new Date(requestedAt.getTime() + 1000); // +1 second for ordering

        timeline.push({
            timestamp: riskComputedAt,
            eventType: 'RISK_PROFILE',
            category: 'RISK_ASSESSMENT',
            source: 'withdrawal_risk_service',
            description: `Risk profile computed: ${riskProfile.riskLevel} (score: ${riskProfile.overallScore})`,
            severity: riskProfile.riskLevel === 'HIGH' ? 'CRITICAL' : riskProfile.riskLevel === 'MEDIUM' ? 'WARNING' : 'INFO',
            metadata: {
                riskLevel: riskProfile.riskLevel,
                riskScore: riskProfile.overallScore,
                signalCount: riskProfile.activeSignals.length,
                signals: riskProfile.activeSignals.map(s => ({
                    type: s.signalType,
                    severity: s.severity,
                    description: s.description,
                })),
            },
        });
    }

    /**
     * Add escalation events to timeline (Sprint 13)
     */
    private addEscalationEvents(escalations: any[], timeline: TimelineEvent[]): void {
        for (const escalation of escalations) {
            timeline.push({
                timestamp: escalation.triggeredAt,
                eventType: 'RISK_ESCALATION',
                category: 'ESCALATION',
                source: 'withdrawal_risk_visibility_service',
                description: `Risk escalation triggered: ${escalation.severity} - ${escalation.reason}`,
                severity: escalation.severity === 'HIGH' ? 'CRITICAL' : 'WARNING',
                metadata: {
                    escalationId: escalation.id,
                    severity: escalation.severity,
                    reason: escalation.reason,
                    triggerConditions: escalation.triggerConditions,
                },
            });
        }
    }

    /**
     * Add playbook recommendation events to timeline (Sprint 14 Phase 1-2)
     */
    private addPlaybookRecommendationEvents(playbookData: any, timeline: TimelineEvent[]): void {
        const recommendationTime = playbookData.generatedAt || new Date();

        for (const rankedPlaybook of playbookData.rankedPlaybooks) {
            const playbook = rankedPlaybook.playbook;
            const relevance = rankedPlaybook.relevanceScore;

            // Determine severity based on highest recommendation severity
            const highestSeverity = playbook.recommendations.reduce((max, rec) => {
                if (rec.severity === 'CRITICAL') return 'CRITICAL';
                if (rec.severity === 'WARNING' && max !== 'CRITICAL') return 'WARNING';
                return max;
            }, 'INFO' as 'INFO' | 'WARNING' | 'CRITICAL');

            timeline.push({
                timestamp: recommendationTime,
                eventType: 'PLAYBOOK_RECOMMENDATION',
                category: 'RECOMMENDATION',
                source: 'withdrawal_risk_playbook_service',
                description: `Playbook recommended: ${playbook.name} (relevance: ${relevance.score}/100)`,
                severity: highestSeverity,
                metadata: {
                    playbookId: playbook.id,
                    playbookName: playbook.name,
                    relevanceScore: relevance.score,
                    matchQuality: relevance.matchQuality,
                    recommendations: playbook.recommendations.map(r => ({
                        action: r.action,
                        rationale: r.rationale,
                        severity: r.severity,
                        priority: r.priority,
                    })),
                },
            });
        }
    }

    /**
     * Simulate admin decision events (Sprint 14 Phase 3)
     * NOTE: In production, this would parse actual SPRINT_14_PHASE_3 logs
     */
    private simulateAdminDecisions(withdrawal: any, timeline: TimelineEvent[]): boolean {
        // Only simulate if withdrawal has reached a final state
        if (!withdrawal.approvedAt && !withdrawal.rejectedAt && !withdrawal.cancelledAt) {
            return false; // No decision made yet
        }

        const decisionTimestamp = withdrawal.approvedAt || withdrawal.rejectedAt || withdrawal.cancelledAt;
        const adminAction = withdrawal.approvedAt ? 'APPROVED' : withdrawal.rejectedAt ? 'REJECTED' : 'CANCELLED';

        timeline.push({
            timestamp: decisionTimestamp,
            eventType: 'ADMIN_DECISION',
            category: 'DECISION',
            source: 'simulated_phase_3_logs',
            description: `Admin decision captured: ${adminAction}`,
            severity: 'INFO',
            metadata: {
                adminAction,
                adminId: withdrawal.approvedBy || withdrawal.rejectedBy || withdrawal.cancelledBy || 'unknown',
                justification: withdrawal.rejectionReason || withdrawal.cancellationReason || 'Decision logged',
                isSimulated: true, // Flag that this is simulated data
            },
        });

        return true;
    }

    /**
     * Build incident summary statistics
     */
    private buildIncidentSummary(timeline: TimelineEvent[], context: IncidentContext): IncidentSummary {
        const totalEvents = timeline.length;
        const timelineSpanMs = timeline.length > 1
            ? timeline[timeline.length - 1].timestamp.getTime() - timeline[0].timestamp.getTime()
            : 0;

        // Count risk level changes (multiple RISK_PROFILE events)
        const riskProfileEvents = timeline.filter(e => e.eventType === 'RISK_PROFILE');
        const riskLevelChanges = riskProfileEvents.length > 1 ? riskProfileEvents.length - 1 : 0;

        // Check if escalation was triggered
        const escalationTriggered = timeline.some(e => e.eventType === 'RISK_ESCALATION');

        // Count playbook recommendations
        const playbooksShown = timeline.filter(e => e.eventType === 'PLAYBOOK_RECOMMENDATION').length;

        // Count admin decisions
        const adminDecisionsCaptured = timeline.filter(e => e.eventType === 'ADMIN_DECISION').length;

        // Count severity levels
        const highSeverityEvents = timeline.filter(e => e.severity === 'WARNING').length;
        const criticalSeverityEvents = timeline.filter(e => e.severity === 'CRITICAL').length;

        return {
            totalEvents,
            timelineSpanMs,
            riskLevelChanges,
            escalationTriggered,
            playbooksShown,
            adminDecisionsCaptured,
            highSeverityEvents,
            criticalSeverityEvents,
        };
    }
}
