import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WithdrawalRiskService } from './withdrawal-risk.service';
import { WithdrawalRiskVisibilityService } from './withdrawal-risk-visibility.service';

/**
 * SPRINT 14 PHASE 1 & 2: Risk Response Playbooks + Contextual Resolution
 * 
 * PURPOSE: Deterministic advisory system that maps risk conditions to recommended admin actions
 * 
 * GOLDEN RULES:
 * - READ-ONLY advisory system (no enforcement)
 * - NO blocks, delays, or mutations to withdrawals
 * - NO ML, randomness, or heuristics (deterministic only)
 * - NO schema or state machine modifications
 * - NO auto-execution of admin actions
 * - Playbooks are recommendations, not decisions
 * 
 * PATTERN:
 * - Static in-memory playbook registry
 * - Deterministic condition matching
 * - Human-readable action recommendations
 * - Clear rationale for each recommendation
 * - Severity classification (INFO, WARNING, CRITICAL)
 * 
 * SPRINT 14 PHASE 2 ENHANCEMENTS:
 * - Contextual resolution with Sprint 13 escalation integration
 * - Deterministic relevance scoring (0-100)
 * - Ranked playbook matching
 * - Explainable match reasons
 */

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Playbook conditions that trigger recommendations
 */
export interface PlaybookConditions {
    // Risk level match (exact or minimum)
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    minRiskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';

    // Required risk signals (any of these must be present)
    requiredSignals?: string[];

    // Withdrawal lifecycle stage
    stage?: 'REQUESTED' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'ANY';

    // Escalation severity (from Sprint 13 Phase 3)
    escalationSeverity?: 'MEDIUM' | 'HIGH';

    // Risk score threshold
    minRiskScore?: number;
    maxRiskScore?: number;
}

/**
 * Recommended admin action with rationale
 */
export interface PlaybookRecommendation {
    action: string;              // Human-readable action description
    rationale: string;           // Why this action is recommended
    severity: 'INFO' | 'WARNING' | 'CRITICAL'; // Recommendation urgency
    priority: number;            // Higher = more urgent (1-10)
}

/**
 * Risk response playbook (static registry entry)
 */
export interface RiskPlaybook {
    id: string;                  // Unique playbook identifier
    name: string;                // Human-readable name
    description: string;         // What this playbook addresses
    conditions: PlaybookConditions; // When to trigger
    recommendations: PlaybookRecommendation[]; // What to recommend
    enabled: boolean;            // Allow disabling without removal
}

/**
 * Matched playbook with context
 */
export interface PlaybookMatchResult {
    playbook: RiskPlaybook;
    matchedConditions: string[]; // Which conditions matched
    recommendations: PlaybookRecommendation[];
    timestamp: Date;
}

/**
 * SPRINT 14 PHASE 2: Relevance score for playbook matching
 * Deterministic scoring based on context alignment
 */
export interface RelevanceScore {
    score: number;               // 0-100, higher = more relevant
    reasons: string[];           // Explainable match factors
    matchQuality: 'EXACT' | 'PARTIAL' | 'WEAK'; // Match strength
}

/**
 * SPRINT 14 PHASE 2: Ranked playbook match with relevance
 */
export interface RankedPlaybookMatch extends PlaybookMatchResult {
    relevanceScore: RelevanceScore;
}

/**
 * Complete playbook recommendation response
 */
export interface PlaybookRecommendationResponse {
    withdrawalId: string;
    userId: string;
    currentRiskLevel: string;
    currentRiskScore: number;
    currentStage: string;
    activeSignals: string[];
    escalationSeverity: string | null;  // PHASE 2: Added escalation context
    matchedPlaybooks: PlaybookMatchResult[];
    totalRecommendations: number;
    highestSeverity: 'INFO' | 'WARNING' | 'CRITICAL' | null;
    generatedAt: Date;
}

/**
 * SPRINT 14 PHASE 2: Enhanced response with relevance ranking
 */
export interface RankedPlaybookRecommendationResponse extends Omit<PlaybookRecommendationResponse, 'matchedPlaybooks'> {
    rankedPlaybooks: RankedPlaybookMatch[];
    contextSummary: {
        totalPlaybooksEvaluated: number;
        matchedPlaybooksCount: number;
        avgRelevanceScore: number;
        escalationDetected: boolean;
    };
}

/**
 * SPRINT 14 PHASE 3: Admin decision capture
 * Observational intelligence for audit and analysis
 */
export interface AdminDecisionCapture {
    withdrawalId: string;
    userId: string;
    adminId: string;
    capturedAt: Date;

    // Context when recommendations were shown
    riskLevel: string;
    riskScore: number;
    stage: string;
    activeSignals: string[];
    escalationSeverity: string | null;

    // Playbooks that were recommended
    playbooksShown: {
        playbookId: string;
        playbookName: string;
        relevanceScore?: number;
        matchQuality?: string;
    }[];

    // Admin's action and reasoning
    adminAction: 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'REVIEWED_NO_ACTION' | 'REQUESTED_MORE_INFO' | 'OTHER';
    actionDetails?: string;

    // Which playbooks influenced the decision (if any)
    playbooksActedUpon: string[]; // Array of playbook IDs

    // Admin's justification
    justification: string;

    // Optional metadata
    actionDurationMs?: number; // Time from viewing recommendations to decision
    notes?: string;
}

/**
 * SPRINT 14 PHASE 3: Decision capture request
 */
export interface CaptureDecisionRequest {
    adminAction: 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'REVIEWED_NO_ACTION' | 'REQUESTED_MORE_INFO' | 'OTHER';
    actionDetails?: string;
    playbooksActedUpon: string[]; // IDs of playbooks that influenced decision
    justification: string;
    actionDurationMs?: number;
    notes?: string;
}

/**
 * SPRINT 14 PHASE 3: Decision capture response
 */
export interface CaptureDecisionResponse {
    acknowledged: boolean;
    capturedAt: Date;
    decisionId: string; // Unique identifier for this logged decision
}

/**
 * SPRINT 14 PHASE 4: Playbook Effectiveness Metrics
 * READ-ONLY aggregation of playbook usage and outcome correlation
 */
export interface PlaybookEffectivenessMetrics {
    playbookId: string;
    playbookName: string;

    // Usage statistics
    timesShown: number;           // How many times this playbook was recommended
    timesActedUpon: number;       // How many times admin cited this playbook in decision
    adoptionRate: number;         // timesActedUpon / timesShown (0-1)

    // Outcome correlation (deterministic aggregation)
    outcomeStats: {
        totalOutcomes: number;    // Total withdrawals with outcomes tracked
        approvedCount: number;    // Withdrawals approved after this playbook shown
        rejectedCount: number;    // Withdrawals rejected after this playbook shown
        escalatedCount: number;   // Withdrawals escalated after this playbook shown
        noActionCount: number;    // Withdrawals with no action after this playbook shown
    };

    // Risk resolution metrics
    riskResolutionStats: {
        avgRiskScoreBefore: number;  // Average risk score when playbook shown
        avgRiskScoreAfter: number;   // Average risk score 24h after decision (if tracked)
        riskReductionRate: number;   // % of cases where risk decreased after action
    };

    // Effectiveness score (deterministic, 0-100)
    effectivenessScore: number;
    effectivenessFactors: string[]; // Explainable reasons for score

    // Time-based metrics
    avgActionDurationMs: number;  // Average time from playbook shown to decision
    lastUsed: Date | null;        // When this playbook was last acted upon

    // Period metadata
    periodStart: Date;
    periodEnd: Date;
    dataPoints: number;           // Number of decision logs analyzed
}

/**
 * SPRINT 14 PHASE 4: Aggregated playbook usage statistics
 */
export interface PlaybookUsageStats {
    totalPlaybooks: number;
    activePlaybooks: number;      // Playbooks enabled
    playbooksUsedInPeriod: number; // Playbooks shown at least once
    totalRecommendations: number;  // Total times playbooks shown
    totalDecisionsCaptured: number; // Total admin decisions logged

    topPlaybooksByUsage: {
        playbookId: string;
        playbookName: string;
        timesShown: number;
    }[];

    topPlaybooksByEffectiveness: {
        playbookId: string;
        playbookName: string;
        effectivenessScore: number;
    }[];

    periodStart: Date;
    periodEnd: Date;
}

/**
 * SPRINT 14 PHASE 4: Effectiveness analysis filters
 */
export interface EffectivenessFilters {
    startDate?: Date;             // Filter decisions after this date
    endDate?: Date;               // Filter decisions before this date
    riskLevels?: string[];        // Filter by risk level (HIGH, MEDIUM, LOW)
    minDataPoints?: number;       // Minimum decisions required for inclusion (default: 3)
    playbookIds?: string[];       // Analyze specific playbooks only
}

/**
 * SPRINT 14 PHASE 4: Outcome correlation analysis
 */
export interface OutcomeCorrelation {
    withdrawalId: string;
    playbookIdsShown: string[];
    playbookIdsActedUpon: string[];
    adminAction: string;
    riskScoreBefore: number;
    riskScoreAfter: number | null;
    outcomeTimestamp: Date;
    resolutionTimeMs: number;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class WithdrawalRiskPlaybookService {
    private readonly logger = new Logger(WithdrawalRiskPlaybookService.name);
    private readonly SPRINT_MARKER_PHASE_1 = 'SPRINT_14_PHASE_1';
    private readonly SPRINT_MARKER_PHASE_2 = 'SPRINT_14_PHASE_2';

    /**
     * Static in-memory playbook registry
     * Deterministic, no database persistence required
     */
    private readonly PLAYBOOK_REGISTRY: RiskPlaybook[] = [
        // ====================================================================
        // HIGH RISK PLAYBOOKS
        // ====================================================================
        {
            id: 'PB_HIGH_VELOCITY_SPIKE',
            name: 'High Velocity Spike Response',
            description: 'Multiple rapid withdrawals detected with velocity spike signal',
            conditions: {
                riskLevel: 'HIGH',
                requiredSignals: ['VELOCITY_SPIKE'],
                stage: 'ANY',
            },
            recommendations: [
                {
                    action: 'Review withdrawal history for last 7 days',
                    rationale: 'Velocity spike indicates abnormal withdrawal frequency - verify legitimate user behavior',
                    severity: 'CRITICAL',
                    priority: 10,
                },
                {
                    action: 'Verify user identity via secondary authentication',
                    rationale: 'Rapid withdrawals may indicate compromised account',
                    severity: 'CRITICAL',
                    priority: 9,
                },
                {
                    action: 'Check for matching IP addresses across recent withdrawals',
                    rationale: 'Consistent IP suggests legitimate user, varying IPs suggest compromise',
                    severity: 'WARNING',
                    priority: 7,
                },
            ],
            enabled: true,
        },
        {
            id: 'PB_HIGH_AMOUNT_DEVIATION',
            name: 'High Amount Deviation Response',
            description: 'Withdrawal amount significantly exceeds user baseline',
            conditions: {
                riskLevel: 'HIGH',
                requiredSignals: ['AMOUNT_DEVIATION'],
                stage: 'ANY',
            },
            recommendations: [
                {
                    action: 'Compare amount to user\'s historical withdrawal average',
                    rationale: 'Large deviation may indicate fraudulent activity or account takeover',
                    severity: 'CRITICAL',
                    priority: 9,
                },
                {
                    action: 'Contact user via registered phone/email to confirm withdrawal',
                    rationale: 'Out-of-pattern amount requires user confirmation before processing',
                    severity: 'CRITICAL',
                    priority: 10,
                },
                {
                    action: 'Review source of funds for this balance',
                    rationale: 'Verify legitimacy of funds before approving large atypical withdrawal',
                    severity: 'WARNING',
                    priority: 6,
                },
            ],
            enabled: true,
        },
        {
            id: 'PB_HIGH_RECENT_REJECTIONS',
            name: 'Recent Rejections Pattern Response',
            description: 'User has recent rejected withdrawals, now requesting again',
            conditions: {
                riskLevel: 'HIGH',
                requiredSignals: ['RECENT_REJECTIONS'],
                stage: 'ANY',
            },
            recommendations: [
                {
                    action: 'Review rejection reasons for previous withdrawals',
                    rationale: 'Repeated attempts after rejection may indicate fraudulent persistence',
                    severity: 'CRITICAL',
                    priority: 8,
                },
                {
                    action: 'Check if previous rejection issues have been resolved',
                    rationale: 'Ensure original concerns addressed before approving new request',
                    severity: 'WARNING',
                    priority: 7,
                },
                {
                    action: 'Consider temporary withdrawal limit reduction',
                    rationale: 'Limit exposure while investigating pattern of rejections',
                    severity: 'WARNING',
                    priority: 5,
                },
            ],
            enabled: true,
        },
        {
            id: 'PB_HIGH_NEW_DESTINATION',
            name: 'New Destination Account Response',
            description: 'Withdrawal to never-before-used bank account or wallet',
            conditions: {
                riskLevel: 'HIGH',
                requiredSignals: ['NEW_DESTINATION'],
                stage: 'ANY',
            },
            recommendations: [
                {
                    action: 'Verify destination account ownership matches user identity',
                    rationale: 'New destination may indicate account takeover or money laundering',
                    severity: 'CRITICAL',
                    priority: 10,
                },
                {
                    action: 'Check destination account against fraud databases',
                    rationale: 'Prevent funds transfer to known fraudulent accounts',
                    severity: 'CRITICAL',
                    priority: 9,
                },
                {
                    action: 'Implement cooling-off period for new destination (24-48 hours)',
                    rationale: 'Delay gives legitimate users time to cancel if unauthorized',
                    severity: 'WARNING',
                    priority: 6,
                },
            ],
            enabled: true,
        },
        {
            id: 'PB_HIGH_FREQUENCY_ACCELERATION',
            name: 'Frequency Acceleration Response',
            description: 'Withdrawal frequency increasing exponentially',
            conditions: {
                riskLevel: 'HIGH',
                requiredSignals: ['FREQUENCY_ACCELERATION'],
                stage: 'ANY',
            },
            recommendations: [
                {
                    action: 'Analyze withdrawal frequency trend over last 30 days',
                    rationale: 'Exponential increase suggests automated scraping or fraud',
                    severity: 'CRITICAL',
                    priority: 9,
                },
                {
                    action: 'Check for bot-like behavior patterns (same amounts, exact intervals)',
                    rationale: 'Automated withdrawals may indicate compromised API keys or account',
                    severity: 'CRITICAL',
                    priority: 8,
                },
                {
                    action: 'Review user account activity (logins, settings changes)',
                    rationale: 'Correlate withdrawal acceleration with other suspicious activity',
                    severity: 'WARNING',
                    priority: 7,
                },
            ],
            enabled: true,
        },

        // ====================================================================
        // MEDIUM RISK PLAYBOOKS
        // ====================================================================
        {
            id: 'PB_MEDIUM_VELOCITY',
            name: 'Medium Velocity Pattern Response',
            description: 'Elevated withdrawal frequency, not yet critical',
            conditions: {
                riskLevel: 'MEDIUM',
                requiredSignals: ['VELOCITY_SPIKE'],
                stage: 'ANY',
            },
            recommendations: [
                {
                    action: 'Monitor withdrawal frequency over next 48 hours',
                    rationale: 'Medium velocity may escalate to high - watch for trend',
                    severity: 'WARNING',
                    priority: 5,
                },
                {
                    action: 'Review user\'s typical withdrawal schedule',
                    rationale: 'Determine if current frequency is out-of-pattern',
                    severity: 'INFO',
                    priority: 3,
                },
            ],
            enabled: true,
        },
        {
            id: 'PB_MEDIUM_AMOUNT',
            name: 'Medium Amount Variation Response',
            description: 'Withdrawal amount moderately above baseline',
            conditions: {
                riskLevel: 'MEDIUM',
                requiredSignals: ['AMOUNT_DEVIATION'],
                stage: 'ANY',
            },
            recommendations: [
                {
                    action: 'Review amount against user\'s available balance',
                    rationale: 'Ensure withdrawal doesn\'t deplete account suspiciously',
                    severity: 'WARNING',
                    priority: 4,
                },
                {
                    action: 'Check if amount rounds to common denominations',
                    rationale: 'Round amounts may indicate legitimate withdrawals',
                    severity: 'INFO',
                    priority: 2,
                },
            ],
            enabled: true,
        },

        // ====================================================================
        // ESCALATION PLAYBOOKS (Sprint 13 Integration)
        // ====================================================================
        {
            id: 'PB_ESCALATION_HIGH_SEVERITY',
            name: 'High Severity Escalation Response',
            description: 'Risk escalated during withdrawal lifecycle (HIGH severity)',
            conditions: {
                escalationSeverity: 'HIGH',
                stage: 'ANY',
            },
            recommendations: [
                {
                    action: 'Halt processing and escalate to senior fraud analyst',
                    rationale: 'HIGH severity escalation indicates significant risk increase mid-lifecycle',
                    severity: 'CRITICAL',
                    priority: 10,
                },
                {
                    action: 'Review escalation timeline and triggering signals',
                    rationale: 'Understand what changed during processing to cause escalation',
                    severity: 'CRITICAL',
                    priority: 9,
                },
                {
                    action: 'Document escalation event in withdrawal notes',
                    rationale: 'Create audit trail for compliance and future reference',
                    severity: 'WARNING',
                    priority: 6,
                },
            ],
            enabled: true,
        },
        {
            id: 'PB_ESCALATION_MEDIUM_SEVERITY',
            name: 'Medium Severity Escalation Response',
            description: 'Risk escalated during withdrawal lifecycle (MEDIUM severity)',
            conditions: {
                escalationSeverity: 'MEDIUM',
                stage: 'ANY',
            },
            recommendations: [
                {
                    action: 'Review new risk signals that caused escalation',
                    rationale: 'MEDIUM escalation warrants closer inspection but not immediate halt',
                    severity: 'WARNING',
                    priority: 7,
                },
                {
                    action: 'Consider additional verification steps before completion',
                    rationale: 'Escalation suggests risk profile changed - validate before processing',
                    severity: 'WARNING',
                    priority: 6,
                },
            ],
            enabled: true,
        },

        // ====================================================================
        // STAGE-SPECIFIC PLAYBOOKS
        // ====================================================================
        {
            id: 'PB_PROCESSING_HIGH_RISK',
            name: 'Processing Stage High Risk Response',
            description: 'High risk withdrawal currently in processing state',
            conditions: {
                riskLevel: 'HIGH',
                stage: 'PROCESSING',
            },
            recommendations: [
                {
                    action: 'Review all available fraud signals before payout execution',
                    rationale: 'Last checkpoint before funds leave platform - thorough review critical',
                    severity: 'CRITICAL',
                    priority: 10,
                },
                {
                    action: 'Verify no recent account changes (email, phone, password)',
                    rationale: 'Account changes during processing may indicate takeover',
                    severity: 'CRITICAL',
                    priority: 9,
                },
                {
                    action: 'Confirm user has not reported account compromise',
                    rationale: 'Check support tickets for fraud reports before completing payout',
                    severity: 'CRITICAL',
                    priority: 8,
                },
            ],
            enabled: true,
        },
        {
            id: 'PB_APPROVED_HIGH_RISK',
            name: 'Approved Stage High Risk Response',
            description: 'High risk withdrawal approved but not yet processing',
            conditions: {
                riskLevel: 'HIGH',
                stage: 'APPROVED',
            },
            recommendations: [
                {
                    action: 'Double-check approval decision against risk signals',
                    rationale: 'HIGH risk at approved stage - ensure approval was intentional',
                    severity: 'WARNING',
                    priority: 7,
                },
                {
                    action: 'Consider brief hold period before moving to processing',
                    rationale: 'Allow time for additional signals or user cancellation',
                    severity: 'INFO',
                    priority: 4,
                },
            ],
            enabled: true,
        },

        // ====================================================================
        // MULTI-SIGNAL PLAYBOOKS (Combined Conditions)
        // ====================================================================
        {
            id: 'PB_MULTI_HIGH_VELOCITY_NEW_DEST',
            name: 'Velocity Spike + New Destination Response',
            description: 'Rapid withdrawals to new destination account (compound risk)',
            conditions: {
                minRiskLevel: 'MEDIUM',
                requiredSignals: ['VELOCITY_SPIKE', 'NEW_DESTINATION'],
                stage: 'ANY',
            },
            recommendations: [
                {
                    action: 'IMMEDIATE REVIEW REQUIRED - high confidence fraud indicator',
                    rationale: 'Combination of velocity spike and new destination is classic account takeover pattern',
                    severity: 'CRITICAL',
                    priority: 10,
                },
                {
                    action: 'Freeze all pending withdrawals for this user',
                    rationale: 'Prevent further potential fraud while investigating',
                    severity: 'CRITICAL',
                    priority: 10,
                },
                {
                    action: 'Initiate account security review protocol',
                    rationale: 'Comprehensive check of account activity, devices, locations',
                    severity: 'CRITICAL',
                    priority: 9,
                },
            ],
            enabled: true,
        },
        {
            id: 'PB_MULTI_HIGH_AMOUNT_NEW_DEST',
            name: 'Amount Deviation + New Destination Response',
            description: 'Large atypical withdrawal to new destination (high fraud risk)',
            conditions: {
                minRiskLevel: 'MEDIUM',
                requiredSignals: ['AMOUNT_DEVIATION', 'NEW_DESTINATION'],
                stage: 'ANY',
            },
            recommendations: [
                {
                    action: 'Mandatory user contact before processing',
                    rationale: 'Large amount to new destination requires explicit user confirmation',
                    severity: 'CRITICAL',
                    priority: 10,
                },
                {
                    action: 'Verify destination account via bank/blockchain lookup',
                    rationale: 'Ensure destination exists and matches user-provided details',
                    severity: 'CRITICAL',
                    priority: 9,
                },
            ],
            enabled: true,
        },

        // ====================================================================
        // LOW RISK PLAYBOOKS (Informational)
        // ====================================================================
        {
            id: 'PB_LOW_RISK_ROUTINE',
            name: 'Low Risk Routine Withdrawal Response',
            description: 'Standard low-risk withdrawal, minimal action required',
            conditions: {
                riskLevel: 'LOW',
                stage: 'ANY',
            },
            recommendations: [
                {
                    action: 'Standard processing - no additional review required',
                    rationale: 'Low risk profile, typical withdrawal pattern',
                    severity: 'INFO',
                    priority: 1,
                },
                {
                    action: 'Continue monitoring for any risk escalation',
                    rationale: 'Maintain baseline surveillance even for low-risk withdrawals',
                    severity: 'INFO',
                    priority: 1,
                },
            ],
            enabled: true,
        },
    ];

    constructor(
        private readonly prisma: PrismaService,
        private readonly riskService: WithdrawalRiskService,
        private readonly visibilityService: WithdrawalRiskVisibilityService,
    ) { }

    /**
     * Get playbook recommendations for a specific withdrawal
     * 
     * PATTERN: Deterministic matching, no randomness, no ML
     * OUTPUT: Human-readable recommendations, not automated decisions
     */
    async getRecommendations(
        withdrawalId: string,
        adminId: string,
    ): Promise<PlaybookRecommendationResponse> {
        // 1. Fetch withdrawal data
        const withdrawal = await this.prisma.withdrawals.findUnique({
            where: { id: withdrawalId },
            include: { users: true },
        });

        if (!withdrawal) {
            throw new Error(`Withdrawal ${withdrawalId} not found`);
        }

        // 2. Get current risk assessment
        const riskProfile = await this.riskService.computeUserRiskProfile(withdrawal.userId);

        // 3. Extract context for matching
        const context = {
            riskLevel: riskProfile.riskLevel,
            riskScore: riskProfile.overallScore,
            stage: withdrawal.status,
            activeSignals: riskProfile.activeSignals.map(s => s.signalType),
            escalationSeverity: null, // TODO: Extract from Sprint 13 escalation data if available
        };

        // 4. Find matching playbooks (deterministic)
        const matchedPlaybooks = this.findMatchingPlaybooks(context);

        // 5. Sort recommendations by priority (highest first)
        matchedPlaybooks.forEach(match => {
            match.recommendations.sort((a, b) => b.priority - a.priority);
        });

        // 6. Determine highest severity across all recommendations
        const allRecommendations = matchedPlaybooks.flatMap(m => m.recommendations);
        const highestSeverity = this.getHighestSeverity(allRecommendations);

        // 7. Audit log
        this.logger.log({
            event: 'playbook_recommendations_generated',
            sprint: this.SPRINT_MARKER_PHASE_1,
            withdrawalId,
            userId: withdrawal.userId,
            adminId,
            riskLevel: context.riskLevel,
            riskScore: context.riskScore,
            matchedPlaybooksCount: matchedPlaybooks.length,
            totalRecommendations: allRecommendations.length,
            highestSeverity,
        });

        return {
            withdrawalId,
            userId: withdrawal.userId,
            currentRiskLevel: context.riskLevel,
            currentRiskScore: context.riskScore,
            currentStage: context.stage,
            activeSignals: context.activeSignals,
            escalationSeverity: context.escalationSeverity,
            matchedPlaybooks,
            totalRecommendations: allRecommendations.length,
            highestSeverity,
            generatedAt: new Date(),
        };
    }

    /**
     * SPRINT 14 PHASE 2: Get ranked playbook recommendations with contextual resolution
     * 
     * ENHANCEMENTS OVER PHASE 1:
     * - Integrates Sprint 13 escalation data for richer context
     * - Computes deterministic relevance scores (0-100)
     * - Ranks playbooks by relevance + priority
     * - Provides explainable match reasons
     * 
     * PATTERN: Deterministic scoring, no randomness, no ML
     * OUTPUT: Ranked recommendations with relevance context
     */
    async getRankedRecommendations(
        withdrawalId: string,
        adminId: string,
    ): Promise<RankedPlaybookRecommendationResponse> {
        const startTime = Date.now();

        // 1. Fetch withdrawal data
        const withdrawal = await this.prisma.withdrawals.findUnique({
            where: { id: withdrawalId },
            include: { users: true },
        });

        if (!withdrawal) {
            throw new Error(`Withdrawal ${withdrawalId} not found`);
        }

        // 2. Get current risk assessment
        const riskProfile = await this.riskService.computeUserRiskProfile(withdrawal.userId);

        // 3. PHASE 2: Query Sprint 13 escalation data for this withdrawal
        let escalationSeverity: 'MEDIUM' | 'HIGH' | null = null;
        let escalationDetected = false;

        try {
            const escalationData = await this.visibilityService.getWithdrawalRiskTimeline(
                withdrawalId,
                adminId,
            );

            if (escalationData.escalations.length > 0) {
                escalationDetected = true;
                // Get highest severity from escalation events
                const severities = escalationData.escalations.map(e => e.severity);
                escalationSeverity = severities.includes('HIGH') ? 'HIGH' : 'MEDIUM';
            }
        } catch (error) {
            // Non-blocking: If escalation query fails, continue without escalation context
            this.logger.warn({
                event: 'escalation_context_query_failed',
                sprint: this.SPRINT_MARKER_PHASE_2,
                withdrawalId,
                error: error.message,
            });
        }

        // 4. Extract enhanced context for matching
        const context = {
            riskLevel: riskProfile.riskLevel,
            riskScore: riskProfile.overallScore,
            stage: withdrawal.status,
            activeSignals: riskProfile.activeSignals.map(s => s.signalType),
            escalationSeverity,
        };

        // 5. Find matching playbooks with relevance scoring
        const rankedPlaybooks = this.findMatchingPlaybooksWithRelevance(context);

        // 6. Sort by relevance score DESC, then by max priority DESC
        rankedPlaybooks.sort((a, b) => {
            // Primary: Relevance score
            if (b.relevanceScore.score !== a.relevanceScore.score) {
                return b.relevanceScore.score - a.relevanceScore.score;
            }
            // Secondary: Highest priority recommendation
            const aMaxPriority = Math.max(...a.recommendations.map(r => r.priority));
            const bMaxPriority = Math.max(...b.recommendations.map(r => r.priority));
            return bMaxPriority - aMaxPriority;
        });

        // 7. Sort recommendations within each playbook by priority
        rankedPlaybooks.forEach(match => {
            match.recommendations.sort((a, b) => b.priority - a.priority);
        });

        // 8. Compute context summary
        const allRecommendations = rankedPlaybooks.flatMap(m => m.recommendations);
        const highestSeverity = this.getHighestSeverity(allRecommendations);
        const avgRelevanceScore = rankedPlaybooks.length > 0
            ? rankedPlaybooks.reduce((sum, p) => sum + p.relevanceScore.score, 0) / rankedPlaybooks.length
            : 0;

        const durationMs = Date.now() - startTime;

        // 9. Audit log with Phase 2 enhancements
        this.logger.log({
            event: 'ranked_playbook_recommendations_generated',
            sprint: this.SPRINT_MARKER_PHASE_2,
            withdrawalId,
            userId: withdrawal.userId,
            adminId,
            riskLevel: context.riskLevel,
            riskScore: context.riskScore,
            escalationSeverity: context.escalationSeverity,
            escalationDetected,
            totalPlaybooksEvaluated: this.PLAYBOOK_REGISTRY.filter(p => p.enabled).length,
            matchedPlaybooksCount: rankedPlaybooks.length,
            totalRecommendations: allRecommendations.length,
            avgRelevanceScore: Math.round(avgRelevanceScore),
            highestSeverity,
            durationMs,
        });

        return {
            withdrawalId,
            userId: withdrawal.userId,
            currentRiskLevel: context.riskLevel,
            currentRiskScore: context.riskScore,
            currentStage: context.stage,
            activeSignals: context.activeSignals,
            escalationSeverity: context.escalationSeverity,
            rankedPlaybooks,
            totalRecommendations: allRecommendations.length,
            highestSeverity,
            generatedAt: new Date(),
            contextSummary: {
                totalPlaybooksEvaluated: this.PLAYBOOK_REGISTRY.filter(p => p.enabled).length,
                matchedPlaybooksCount: rankedPlaybooks.length,
                avgRelevanceScore: Math.round(avgRelevanceScore),
                escalationDetected,
            },
        };
    }

    /**
     * Find all playbooks that match current withdrawal context
     * 
     * DETERMINISTIC: Same inputs always produce same outputs
     * NO RANDOMNESS: No probability, no ML, no heuristics
     */
    private findMatchingPlaybooks(context: {
        riskLevel: string;
        riskScore: number;
        stage: string;
        activeSignals: string[];
        escalationSeverity: string | null;
    }): PlaybookMatchResult[] {
        const matches: PlaybookMatchResult[] = [];

        for (const playbook of this.PLAYBOOK_REGISTRY) {
            if (!playbook.enabled) continue;

            const matchResult = this.evaluatePlaybookConditions(playbook, context);

            if (matchResult.isMatch) {
                matches.push({
                    playbook,
                    matchedConditions: matchResult.matchedConditions,
                    recommendations: playbook.recommendations,
                    timestamp: new Date(),
                });
            }
        }

        return matches;
    }

    /**
     * SPRINT 14 PHASE 2: Find matching playbooks with relevance scoring
     * 
     * DETERMINISTIC: Same inputs always produce same outputs
     * SCORING: 0-100 scale based on condition alignment
     */
    private findMatchingPlaybooksWithRelevance(context: {
        riskLevel: string;
        riskScore: number;
        stage: string;
        activeSignals: string[];
        escalationSeverity: string | null;
    }): RankedPlaybookMatch[] {
        const matches: RankedPlaybookMatch[] = [];

        for (const playbook of this.PLAYBOOK_REGISTRY) {
            if (!playbook.enabled) continue;

            const matchResult = this.evaluatePlaybookConditions(playbook, context);

            if (matchResult.isMatch) {
                // Compute relevance score for this match
                const relevanceScore = this.computeRelevanceScore(
                    playbook,
                    context,
                    matchResult.matchedConditions,
                );

                matches.push({
                    playbook,
                    matchedConditions: matchResult.matchedConditions,
                    recommendations: playbook.recommendations,
                    timestamp: new Date(),
                    relevanceScore,
                });
            }
        }

        return matches;
    }

    /**
     * SPRINT 14 PHASE 2: Compute deterministic relevance score
     * 
     * SCORING ALGORITHM (0-100):
     * - Base score: 40 (all conditions matched)
     * - Exact risk level match: +20
     * - Stage-specific match (not ANY): +15
     * - Multi-signal match (2+): +10
     * - Escalation severity match: +10
     * - High number of matched conditions: +5
     * 
     * DETERMINISTIC: Same inputs always produce same score
     * NO ML: Pure rule-based scoring
     */
    private computeRelevanceScore(
        playbook: RiskPlaybook,
        context: {
            riskLevel: string;
            riskScore: number;
            stage: string;
            activeSignals: string[];
            escalationSeverity: string | null;
        },
        matchedConditions: string[],
    ): RelevanceScore {
        let score = 40; // Base score for any match
        const reasons: string[] = [];
        let matchQuality: 'EXACT' | 'PARTIAL' | 'WEAK' = 'WEAK';

        const conditions = playbook.conditions;

        // Exact risk level match (not minimum)
        if (conditions.riskLevel && conditions.riskLevel === context.riskLevel) {
            score += 20;
            reasons.push(`Exact risk level match: ${context.riskLevel}`);
            matchQuality = 'EXACT';
        } else if (conditions.minRiskLevel) {
            score += 10;
            reasons.push(`Minimum risk level satisfied: ${conditions.minRiskLevel}`);
            matchQuality = 'PARTIAL';
        }

        // Stage-specific match (not ANY)
        if (conditions.stage && conditions.stage !== 'ANY' && conditions.stage === context.stage) {
            score += 15;
            reasons.push(`Stage-specific match: ${context.stage}`);
            if (matchQuality !== 'EXACT') matchQuality = 'PARTIAL';
        }

        // Multi-signal match (compound risk)
        if (conditions.requiredSignals && conditions.requiredSignals.length >= 2) {
            score += 10;
            reasons.push(`Compound risk detected: ${conditions.requiredSignals.length} signals required`);
        }

        // Escalation severity match
        if (conditions.escalationSeverity && context.escalationSeverity === conditions.escalationSeverity) {
            score += 10;
            reasons.push(`Escalation severity match: ${context.escalationSeverity}`);
            matchQuality = 'EXACT';
        }

        // High number of matched conditions
        if (matchedConditions.length >= 3) {
            score += 5;
            reasons.push(`Multiple conditions matched: ${matchedConditions.length}`);
        }

        // Cap score at 100
        score = Math.min(score, 100);

        return {
            score,
            reasons,
            matchQuality,
        };
    }

    /**
     * Evaluate if playbook conditions match current context
     * 
     * DETERMINISTIC: Exact matching logic, no fuzzy matching
     */
    private evaluatePlaybookConditions(
        playbook: RiskPlaybook,
        context: {
            riskLevel: string;
            riskScore: number;
            stage: string;
            activeSignals: string[];
            escalationSeverity: string | null;
        },
    ): { isMatch: boolean; matchedConditions: string[] } {
        const conditions = playbook.conditions;
        const matched: string[] = [];

        // Check exact risk level match
        if (conditions.riskLevel) {
            if (context.riskLevel === conditions.riskLevel) {
                matched.push(`riskLevel=${conditions.riskLevel}`);
            } else {
                return { isMatch: false, matchedConditions: [] };
            }
        }

        // Check minimum risk level (hierarchy: LOW < MEDIUM < HIGH)
        if (conditions.minRiskLevel) {
            const riskLevels = ['LOW', 'MEDIUM', 'HIGH'];
            const contextLevel = riskLevels.indexOf(context.riskLevel);
            const minLevel = riskLevels.indexOf(conditions.minRiskLevel);

            if (contextLevel >= minLevel) {
                matched.push(`minRiskLevel=${conditions.minRiskLevel}`);
            } else {
                return { isMatch: false, matchedConditions: [] };
            }
        }

        // Check required signals (ALL must be present)
        if (conditions.requiredSignals && conditions.requiredSignals.length > 0) {
            const allSignalsPresent = conditions.requiredSignals.every(signal =>
                context.activeSignals.includes(signal)
            );

            if (allSignalsPresent) {
                matched.push(`requiredSignals=[${conditions.requiredSignals.join(',')}]`);
            } else {
                return { isMatch: false, matchedConditions: [] };
            }
        }

        // Check stage match
        if (conditions.stage && conditions.stage !== 'ANY') {
            if (context.stage === conditions.stage) {
                matched.push(`stage=${conditions.stage}`);
            } else {
                return { isMatch: false, matchedConditions: [] };
            }
        }

        // Check escalation severity
        if (conditions.escalationSeverity) {
            if (context.escalationSeverity === conditions.escalationSeverity) {
                matched.push(`escalationSeverity=${conditions.escalationSeverity}`);
            } else {
                return { isMatch: false, matchedConditions: [] };
            }
        }

        // Check risk score thresholds
        if (conditions.minRiskScore !== undefined) {
            if (context.riskScore >= conditions.minRiskScore) {
                matched.push(`minRiskScore=${conditions.minRiskScore}`);
            } else {
                return { isMatch: false, matchedConditions: [] };
            }
        }

        if (conditions.maxRiskScore !== undefined) {
            if (context.riskScore <= conditions.maxRiskScore) {
                matched.push(`maxRiskScore=${conditions.maxRiskScore}`);
            } else {
                return { isMatch: false, matchedConditions: [] };
            }
        }

        // All conditions matched
        return { isMatch: true, matchedConditions: matched };
    }

    /**
     * Determine highest severity from list of recommendations
     */
    private getHighestSeverity(
        recommendations: PlaybookRecommendation[],
    ): 'INFO' | 'WARNING' | 'CRITICAL' | null {
        if (recommendations.length === 0) return null;

        const severities = recommendations.map(r => r.severity);

        if (severities.includes('CRITICAL')) return 'CRITICAL';
        if (severities.includes('WARNING')) return 'WARNING';
        return 'INFO';
    }

    /**
     * Get all enabled playbooks (for admin review)
     */
    getAllPlaybooks(): RiskPlaybook[] {
        return this.PLAYBOOK_REGISTRY.filter(p => p.enabled);
    }

    /**
     * Get playbook by ID
     */
    getPlaybookById(id: string): RiskPlaybook | null {
        return this.PLAYBOOK_REGISTRY.find(p => p.id === id) || null;
    }

    /**
     * SPRINT 14 – PHASE 3: Capture admin decision after viewing playbook recommendations
     * 
     * PURPOSE: Observational intelligence – log what admins decide after viewing playbooks
     * PATTERN: Log-based, append-only, no database writes, no enforcement
     * 
     * GOLDEN RULE COMPLIANCE:
     * ✅ Does NOT alter withdrawal state
     * ✅ Does NOT block admin actions
     * ✅ Does NOT enforce recommendations
     * ✅ Does NOT modify approval logic
     * ✅ Purely observational
     * 
     * USE CASES:
     * - Audit trail: Track decision-making process
     * - Compliance: Document justification for regulatory review
     * - Analysis: Understand which playbooks influence decisions
     * - Learning: Identify effective vs. ignored playbooks
     */
    async logAdminDecision(
        withdrawalId: string,
        request: CaptureDecisionRequest,
        adminId: string,
        context: {
            riskLevel: string;
            riskScore: number;
            stage: string;
            activeSignals: string[];
            escalationSeverity?: string;
            playbooksShown: Array<{
                playbookId: string;
                playbookName: string;
                relevanceScore: number;
                matchQuality: string;
            }>;
        },
    ): Promise<CaptureDecisionResponse> {
        // 1. Generate unique decision ID (timestamp-based for audit trail)
        const decisionId = `decision_${withdrawalId}_${Date.now()}`;
        const capturedAt = new Date();

        // 2. Fetch withdrawal for userId context
        const withdrawal = await this.prisma.withdrawals.findUnique({
            where: { id: withdrawalId },
            select: { userId: true },
        });

        if (!withdrawal) {
            throw new Error(`Withdrawal ${withdrawalId} not found for decision capture`);
        }

        // 3. Build complete AdminDecisionCapture object
        const decisionCapture: AdminDecisionCapture = {
            withdrawalId,
            userId: withdrawal.userId,
            adminId,
            capturedAt,

            // Context at time of decision
            riskLevel: context.riskLevel,
            riskScore: context.riskScore,
            stage: context.stage,
            activeSignals: context.activeSignals,
            escalationSeverity: context.escalationSeverity,

            // Playbooks shown to admin
            playbooksShown: context.playbooksShown,

            // Admin's decision
            adminAction: request.adminAction,
            actionDetails: request.actionDetails,
            playbooksActedUpon: request.playbooksActedUpon,
            justification: request.justification,

            // Optional metadata
            actionDurationMs: request.actionDurationMs,
            notes: request.notes,
        };

        // 4. Structured logging with SPRINT_14_PHASE_3 marker
        // Pattern: Append-only, no database writes, audit trail in logs
        console.log(JSON.stringify({
            marker: 'SPRINT_14_PHASE_3',
            type: 'ADMIN_DECISION_CAPTURE',
            decisionId,
            timestamp: capturedAt.toISOString(),
            decision: decisionCapture,
            analytics: {
                playbooksShownCount: context.playbooksShown.length,
                playbooksActedUponCount: request.playbooksActedUpon.length,
                hadJustification: !!request.justification,
                actionDuration: request.actionDurationMs,
            },
        }));

        // 5. Return acknowledgment (no mutation, just confirmation)
        return {
            acknowledged: true,
            capturedAt,
            decisionId,
        };
    }

    // ========================================================================
    // SPRINT 14 – PHASE 4: PLAYBOOK EFFECTIVENESS & OUTCOME METRICS
    // ========================================================================

    /**
     * SPRINT 14 – PHASE 4: Get effectiveness metrics for all playbooks or specific playbook
     * 
     * PURPOSE: READ-ONLY aggregation correlating playbooks → decisions → outcomes
     * PATTERN: Parse logged decision data, aggregate with withdrawal outcomes
     * 
     * GOLDEN RULE COMPLIANCE:
     * ✅ READ-ONLY aggregation only
     * ✅ NO schema changes
     * ✅ NO ML or probabilistic logic (deterministic scoring)
     * ✅ NO enforcement or blocking
     * ✅ NO admin scoring at individual level
     * ✅ Explainable effectiveness scoring (0-100)
     * 
     * USE CASES:
     * - Audit: Which playbooks are most used?
     * - Compliance: Demonstrate playbook effectiveness for regulators
     * - Analysis: Which playbooks correlate with approved vs. rejected withdrawals?
     * - Improvement: Identify playbooks needing refinement
     * 
     * NOTE: In production, this would query a log aggregation service (ELK, Datadog, etc.)
     *       For this implementation, we simulate by querying recent withdrawal outcomes
     */
    async getPlaybookEffectiveness(
        filters: EffectivenessFilters = {},
    ): Promise<PlaybookEffectivenessMetrics[]> {
        const SPRINT_MARKER = 'SPRINT_14_PHASE_4';

        this.logger.log({
            marker: SPRINT_MARKER,
            action: 'get_playbook_effectiveness',
            filters,
        });

        try {
            // 1. Set default filters
            const startDate = filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days
            const endDate = filters.endDate || new Date();
            const minDataPoints = filters.minDataPoints || 3;

            // 2. Simulate log parsing: In production, query log aggregation service
            //    For now, we'll analyze withdrawal outcomes directly from database
            const decisionsAnalyzed = await this.correlateWithOutcomes(startDate, endDate, filters.riskLevels);

            // 3. Aggregate metrics by playbook
            const playbookMetricsMap = new Map<string, PlaybookEffectivenessMetrics>();

            for (const playbook of this.PLAYBOOK_REGISTRY) {
                if (filters.playbookIds && !filters.playbookIds.includes(playbook.id)) {
                    continue; // Skip if not in filter
                }

                const relevantDecisions = decisionsAnalyzed.filter(d =>
                    d.playbookIdsShown.includes(playbook.id)
                );

                if (relevantDecisions.length < minDataPoints) {
                    continue; // Skip playbooks with insufficient data
                }

                const actedUponDecisions = relevantDecisions.filter(d =>
                    d.playbookIdsActedUpon.includes(playbook.id)
                );

                // Calculate outcome statistics
                const approvedCount = relevantDecisions.filter(d => d.adminAction === 'APPROVED').length;
                const rejectedCount = relevantDecisions.filter(d => d.adminAction === 'REJECTED').length;
                const escalatedCount = relevantDecisions.filter(d => d.adminAction === 'ESCALATED').length;
                const noActionCount = relevantDecisions.filter(d => d.adminAction === 'REVIEWED_NO_ACTION').length;

                // Calculate risk resolution metrics
                const withRiskScoreAfter = relevantDecisions.filter(d => d.riskScoreAfter !== null);
                const avgRiskScoreBefore = relevantDecisions.reduce((sum, d) => sum + d.riskScoreBefore, 0) / relevantDecisions.length;
                const avgRiskScoreAfter = withRiskScoreAfter.length > 0
                    ? withRiskScoreAfter.reduce((sum, d) => sum + (d.riskScoreAfter || 0), 0) / withRiskScoreAfter.length
                    : avgRiskScoreBefore;
                const riskReductionRate = withRiskScoreAfter.filter(d => (d.riskScoreAfter || 0) < d.riskScoreBefore).length / Math.max(withRiskScoreAfter.length, 1);

                // Calculate time metrics
                const avgActionDurationMs = relevantDecisions.reduce((sum, d) => sum + d.resolutionTimeMs, 0) / relevantDecisions.length;
                const lastUsed = actedUponDecisions.length > 0
                    ? new Date(Math.max(...actedUponDecisions.map(d => d.outcomeTimestamp.getTime())))
                    : null;

                // Compute effectiveness score
                const effectivenessResult = this.computeEffectivenessScore({
                    timesShown: relevantDecisions.length,
                    timesActedUpon: actedUponDecisions.length,
                    approvedCount,
                    rejectedCount,
                    escalatedCount,
                    riskReductionRate,
                    avgActionDurationMs,
                });

                const metrics: PlaybookEffectivenessMetrics = {
                    playbookId: playbook.id,
                    playbookName: playbook.name,
                    timesShown: relevantDecisions.length,
                    timesActedUpon: actedUponDecisions.length,
                    adoptionRate: relevantDecisions.length > 0 ? actedUponDecisions.length / relevantDecisions.length : 0,
                    outcomeStats: {
                        totalOutcomes: relevantDecisions.length,
                        approvedCount,
                        rejectedCount,
                        escalatedCount,
                        noActionCount,
                    },
                    riskResolutionStats: {
                        avgRiskScoreBefore,
                        avgRiskScoreAfter,
                        riskReductionRate,
                    },
                    effectivenessScore: effectivenessResult.score,
                    effectivenessFactors: effectivenessResult.factors,
                    avgActionDurationMs,
                    lastUsed,
                    periodStart: startDate,
                    periodEnd: endDate,
                    dataPoints: relevantDecisions.length,
                };

                playbookMetricsMap.set(playbook.id, metrics);
            }

            // 4. Return sorted by effectiveness score
            const metrics = Array.from(playbookMetricsMap.values());
            metrics.sort((a, b) => b.effectivenessScore - a.effectivenessScore);

            this.logger.log({
                marker: SPRINT_MARKER,
                action: 'playbook_effectiveness_computed',
                metricsCount: metrics.length,
                periodStart: startDate,
                periodEnd: endDate,
            });

            return metrics;
        } catch (error) {
            this.logger.error({
                marker: SPRINT_MARKER,
                action: 'get_playbook_effectiveness_error',
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * SPRINT 14 – PHASE 4: Get aggregated playbook usage statistics
     */
    async aggregatePlaybookUsage(
        filters: EffectivenessFilters = {},
    ): Promise<PlaybookUsageStats> {
        const SPRINT_MARKER = 'SPRINT_14_PHASE_4';

        try {
            const effectivenessMetrics = await this.getPlaybookEffectiveness(filters);

            const totalRecommendations = effectivenessMetrics.reduce((sum, m) => sum + m.timesShown, 0);
            const totalDecisionsCaptured = effectivenessMetrics.reduce((sum, m) => sum + m.dataPoints, 0);

            const topByUsage = [...effectivenessMetrics]
                .sort((a, b) => b.timesShown - a.timesShown)
                .slice(0, 10)
                .map(m => ({
                    playbookId: m.playbookId,
                    playbookName: m.playbookName,
                    timesShown: m.timesShown,
                }));

            const topByEffectiveness = [...effectivenessMetrics]
                .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
                .slice(0, 10)
                .map(m => ({
                    playbookId: m.playbookId,
                    playbookName: m.playbookName,
                    effectivenessScore: m.effectivenessScore,
                }));

            const stats: PlaybookUsageStats = {
                totalPlaybooks: this.PLAYBOOK_REGISTRY.length,
                activePlaybooks: this.PLAYBOOK_REGISTRY.filter(p => p.enabled).length,
                playbooksUsedInPeriod: effectivenessMetrics.length,
                totalRecommendations,
                totalDecisionsCaptured,
                topPlaybooksByUsage: topByUsage,
                topPlaybooksByEffectiveness: topByEffectiveness,
                periodStart: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                periodEnd: filters.endDate || new Date(),
            };

            this.logger.log({
                marker: SPRINT_MARKER,
                action: 'playbook_usage_aggregated',
                stats,
            });

            return stats;
        } catch (error) {
            this.logger.error({
                marker: SPRINT_MARKER,
                action: 'aggregate_playbook_usage_error',
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * SPRINT 14 – PHASE 4: Compute deterministic effectiveness score (0-100)
     * 
     * SCORING ALGORITHM (Deterministic):
     * Base: 20 points (playbook exists and has data)
     * Adoption: +30 points (adoptionRate * 30) – how often admins act on this playbook
     * Risk Reduction: +25 points (riskReductionRate * 25) – does it correlate with risk decrease?
     * Decision Speed: +15 points (faster decisions = more efficient guidance)
     * Approval Correlation: +10 points (if most outcomes are approved, suggests good guidance)
     * 
     * EXPLAINABILITY: Returns factors array explaining each component
     */
    private computeEffectivenessScore(params: {
        timesShown: number;
        timesActedUpon: number;
        approvedCount: number;
        rejectedCount: number;
        escalatedCount: number;
        riskReductionRate: number;
        avgActionDurationMs: number;
    }): { score: number; factors: string[] } {
        const factors: string[] = [];
        let score = 20; // Base score

        // 1. Adoption rate (0-30 points)
        const adoptionRate = params.timesShown > 0 ? params.timesActedUpon / params.timesShown : 0;
        const adoptionPoints = Math.round(adoptionRate * 30);
        score += adoptionPoints;
        factors.push(`Adoption rate: ${(adoptionRate * 100).toFixed(1)}% (+${adoptionPoints} points)`);

        // 2. Risk reduction (0-25 points)
        const riskReductionPoints = Math.round(params.riskReductionRate * 25);
        score += riskReductionPoints;
        factors.push(`Risk reduction rate: ${(params.riskReductionRate * 100).toFixed(1)}% (+${riskReductionPoints} points)`);

        // 3. Decision speed (0-15 points) – faster decisions = clearer guidance
        const avgMinutes = params.avgActionDurationMs / (1000 * 60);
        let speedPoints = 0;
        if (avgMinutes <= 5) speedPoints = 15;
        else if (avgMinutes <= 15) speedPoints = 10;
        else if (avgMinutes <= 30) speedPoints = 5;
        score += speedPoints;
        factors.push(`Avg decision time: ${avgMinutes.toFixed(1)} min (+${speedPoints} points)`);

        // 4. Approval correlation (0-10 points) – playbook guides to correct approval decisions
        const totalOutcomes = params.approvedCount + params.rejectedCount + params.escalatedCount;
        const approvalRate = totalOutcomes > 0 ? params.approvedCount / totalOutcomes : 0;
        let approvalPoints = 0;
        if (approvalRate >= 0.7) approvalPoints = 10; // High approval = good guidance for legitimate withdrawals
        else if (approvalRate >= 0.5) approvalPoints = 5;
        score += approvalPoints;
        factors.push(`Approval rate: ${(approvalRate * 100).toFixed(1)}% (+${approvalPoints} points)`);

        // Ensure score is within bounds
        score = Math.max(0, Math.min(100, score));

        return { score, factors };
    }

    /**
     * SPRINT 14 – PHASE 4: Correlate logged decisions with withdrawal outcomes
     * 
     * PURPOSE: Bridge gap between logged decisions and actual withdrawal state
     * PATTERN: Query withdrawal outcomes from database for given period
     * 
     * NOTE: In production, this would parse SPRINT_14_PHASE_3 logs from log aggregation service
     *       For this implementation, we simulate by analyzing recent withdrawal state changes
     */
    private async correlateWithOutcomes(
        startDate: Date,
        endDate: Date,
        riskLevels?: string[],
    ): Promise<OutcomeCorrelation[]> {
        const SPRINT_MARKER = 'SPRINT_14_PHASE_4';

        try {
            // 1. Query withdrawals in period (using 'status' field from actual schema)
            const withdrawals = await this.prisma.withdrawals.findMany({
                where: {
                    updatedAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                    status: {
                        in: ['APPROVED', 'REJECTED', 'COMPLETED'],
                    },
                },
                select: {
                    id: true,
                    userId: true,
                    status: true,
                    requestedAmount: true,
                    createdAt: true,
                    updatedAt: true,
                },
                take: 1000, // Limit for performance
            });

            // 2. Simulate decision correlation (in production, join with parsed logs)
            const correlations: OutcomeCorrelation[] = [];

            for (const withdrawal of withdrawals) {
                // Simulate: Get risk profile for this withdrawal
                // In production, this would be from Phase 3 decision logs
                let riskProfile;
                try {
                    riskProfile = await this.riskService.computeUserRiskProfile(withdrawal.userId);
                } catch (err) {
                    continue; // Skip if risk profile unavailable
                }

                // Filter by risk level if specified
                if (riskLevels && riskLevels.length > 0 && !riskLevels.includes(riskProfile.riskLevel)) {
                    continue;
                }

                // Build context for playbook matching
                const context = {
                    riskLevel: riskProfile.riskLevel,
                    riskScore: riskProfile.riskScore,
                    stage: withdrawal.status, // Map withdrawal status to stage
                    activeSignals: riskProfile.signals.map(s => s.signalType),
                    escalationSeverity: null, // Not available in simulation
                };

                // Simulate: Match playbooks that would have been shown
                let matchedPlaybooks;
                try {
                    matchedPlaybooks = this.findMatchingPlaybooks(context);
                } catch (err) {
                    continue; // Skip if matching fails
                }

                const playbookIdsShown = matchedPlaybooks.map(m => m.playbook.id);

                // Simulate: Random subset acted upon (in production, parse from Phase 3 logs)
                const playbookIdsActedUpon = playbookIdsShown.slice(0, Math.max(1, Math.floor(playbookIdsShown.length * 0.4)));

                // Map status to admin action
                let adminAction = 'REVIEWED_NO_ACTION';
                if (withdrawal.status === 'APPROVED' || withdrawal.status === 'COMPLETED') adminAction = 'APPROVED';
                else if (withdrawal.status === 'REJECTED') adminAction = 'REJECTED';

                // Simulate risk score (would be from decision logs in production)
                const riskScoreBefore = riskProfile.riskScore;
                const riskScoreAfter = null; // Not tracked in current implementation

                // Calculate resolution time
                const resolutionTimeMs = withdrawal.updatedAt.getTime() - withdrawal.createdAt.getTime();

                correlations.push({
                    withdrawalId: withdrawal.id,
                    playbookIdsShown,
                    playbookIdsActedUpon,
                    adminAction,
                    riskScoreBefore,
                    riskScoreAfter,
                    outcomeTimestamp: withdrawal.updatedAt,
                    resolutionTimeMs,
                });
            }

            this.logger.log({
                marker: SPRINT_MARKER,
                action: 'correlate_with_outcomes',
                correlationsCount: correlations.length,
                periodStart: startDate,
                periodEnd: endDate,
            });

            return correlations;
        } catch (error) {
            this.logger.error({
                marker: SPRINT_MARKER,
                action: 'correlate_with_outcomes_error',
                error: error.message,
            });
            return []; // Graceful degradation
        }
    }

    /**
     * SPRINT 14 – PHASE 4: Get effectiveness metrics for a specific playbook
     */
    async getPlaybookEffectivenessById(
        playbookId: string,
        filters: EffectivenessFilters = {},
    ): Promise<PlaybookEffectivenessMetrics | null> {
        const allMetrics = await this.getPlaybookEffectiveness({
            ...filters,
            playbookIds: [playbookId],
        });

        return allMetrics.find(m => m.playbookId === playbookId) || null;
    }
}
