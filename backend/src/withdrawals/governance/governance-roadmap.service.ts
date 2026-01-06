/**
 * SPRINT 19 – PHASE 4: Governance Roadmap Synthesis Service
 * 
 * PURPOSE:
 * Synthesize control gaps, attributions, and remediation forecasts into
 * executive-grade governance roadmap with logical phase sequencing.
 * 
 * SYNTHESIS APPROACH:
 * - Rule-based phase grouping (static logic)
 * - Deterministic phase sequencing (ROADMAP_SEQUENCING_RULES)
 * - Cumulative score & maturity progression tracking
 * - Advisory-only positioning (no execution mandates)
 * 
 * QUALITY STANDARD:
 * Regulator- and board-consumable roadmap for governance planning.
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
    GovernanceRoadmap,
    GovernanceRoadmapPhase,
    RoadmapPhaseObjective,
    AddressedGapRef,
    RemediationActionRef,
    CumulativeScoreImpact,
    MaturityStageTransition,
    EvidenceReference,
    RoadmapAssumption,
    RoadmapConstraint,
    RoadmapSummary,
    RoadmapPhaseRisk,
    GOVERNANCE_ROADMAP_DISCLAIMER,
    ROADMAP_SEQUENCING_RULES,
    calculatePhaseRisk,
    truncateToHour,
    sortGapsBySeverity,
    formatMaturityStage,
} from './governance-roadmap.types';
import { GovernanceMaturityStage } from './governance-timeline.types';
import { GapSeverity } from './governance-attribution.types';
import { RemediationActionCategory, GovernanceRemediationAction } from './governance-remediation.types';
import { ControlGap } from './control-gap.types';
import { ControlGapService } from './control-gap.service';
import { GovernanceAttributionService } from './governance-attribution.service';
import { GovernanceRemediationService } from './governance-remediation.service';
import { GovernanceTimelineService } from './governance-timeline.service';
import { GovernanceReadinessService } from './governance-readiness.service';

/**
 * Roadmap Synthesis Service
 * 
 * Generates executive-grade governance roadmap by synthesizing
 * all Sprint 17 & 19 governance layers into logical phase sequence.
 */
@Injectable()
export class GovernanceRoadmapService {
    private readonly logger = new Logger(GovernanceRoadmapService.name);

    constructor(
        private readonly readinessService: GovernanceReadinessService,
        private readonly gapService: ControlGapService,
        private readonly attributionService: GovernanceAttributionService,
        private readonly remediationService: GovernanceRemediationService,
        private readonly timelineService: GovernanceTimelineService,
    ) { }

    /**
     * Generate Governance Roadmap
     * 
     * Synthesizes complete governance roadmap from:
     * - Sprint 17 Phase 2: Control gaps
     * - Sprint 19 Phase 2: Gap attributions
     * - Sprint 19 Phase 3: Remediation forecasts
     * - Sprint 19 Phase 1: Timeline & maturity
     * 
     * OUTPUTS:
     * - Ordered roadmap phases (1..N)
     * - Cumulative score & maturity progression
     * - Risk assessments per phase
     * - Evidence references
     * - Explicit assumptions & constraints
     * 
     * DETERMINISM GUARANTEE:
     * Same governance state → same roadmap structure (hour-stable)
     */
    async generateGovernanceRoadmap(): Promise<GovernanceRoadmap> {
        this.logger.log('[SPRINT_19_PHASE_4] Generating governance roadmap...');

        // Step 1: Get current governance state
        const readiness = await this.readinessService.generateReadinessSnapshot();
        const gapReport = await this.gapService.generateControlGapReport();
        const attributionReport = await this.attributionService.generateAttributionReport();
        const forecast = await this.remediationService.generateRemediationForecast();
        const timelineReport = await this.timelineService.generateGovernanceTimeline();

        const baselineMaturityStage = attributionReport.maturityStage as GovernanceMaturityStage;
        const targetMaturityStage = forecast.projectedMaturityStage;
        const baselineScore = readiness.overallScore;

        this.logger.debug(
            `Baseline: ${baselineMaturityStage}, Target: ${targetMaturityStage}, ` +
            `${gapReport.gaps.length} gaps, ${forecast.actionsConsidered.length} actions`
        );

        // Step 2: Group remediation actions into logical phases
        const phases = this.synthesizeRoadmapPhases(
            [...gapReport.gaps],
            [...forecast.actionsConsidered],
            baselineMaturityStage,
            baselineScore
        );

        this.logger.debug(`Synthesized ${phases.length} roadmap phases`);

        // Step 3: Calculate roadmap summary
        const summary = this.calculateRoadmapSummary(
            phases,
            baselineMaturityStage,
            targetMaturityStage,
            baselineScore,
            forecast.projectedScore
        );

        // Step 4: Define explicit assumptions
        const assumptions = this.getRoadmapAssumptions();

        // Step 5: Define explicit constraints
        const constraints = this.getRoadmapConstraints();

        // Step 6: Generate deterministic roadmap ID
        const roadmapId = this.generateRoadmapId(
            baselineMaturityStage,
            targetMaturityStage,
            phases.length
        );

        const roadmap: GovernanceRoadmap = {
            roadmapId,
            generatedAt: truncateToHour(new Date().toISOString()),
            baselineMaturityStage,
            targetMaturityStage,
            roadmapPhases: phases,
            summary,
            assumptions,
            constraints,
            mandatoryDisclaimer: GOVERNANCE_ROADMAP_DISCLAIMER,
        };

        this.logger.log(
            `[SPRINT_19_PHASE_4] Roadmap generated: ${phases.length} phases, ` +
            `${baselineMaturityStage} → ${targetMaturityStage}`
        );

        return roadmap;
    }

    /**
     * Synthesize Roadmap Phases
     * 
     * Groups remediation actions into logical phases using static sequencing rules.
     * 
     * PHASE GROUPING STRATEGY:
     * 1. Group by severity (HIGH → MEDIUM → LOW)
     * 2. Within severity, group by action category priority
     * 3. Calculate cumulative score & maturity progression
     * 4. Generate phase objectives & risk assessments
     * 
     * SEQUENCING RULES:
     * - See ROADMAP_SEQUENCING_RULES in types
     */
    private synthesizeRoadmapPhases(
        gaps: ControlGap[],
        actions: GovernanceRemediationAction[],
        baselineMaturityStage: GovernanceMaturityStage,
        baselineScore: number
    ): GovernanceRoadmapPhase[] {
        // Sort actions by sequencing rules
        const sortedActions = this.sortActionsBySequencingRules(actions);

        // Group actions into phases
        const phaseGroups = this.groupActionsIntoPhases(sortedActions, gaps);

        // Build roadmap phases with cumulative tracking
        const phases: GovernanceRoadmapPhase[] = [];
        let cumulativeScore = baselineScore;
        let currentMaturityStage = baselineMaturityStage;

        for (let i = 0; i < phaseGroups.length; i++) {
            const group = phaseGroups[i];
            const sequenceOrder = i + 1;

            // Calculate phase score delta
            const phaseDelta = group.actions.reduce((sum, a) => sum + a.expectedDimensionDelta, 0);
            cumulativeScore = Math.min(100, cumulativeScore + phaseDelta);

            // Project maturity stage after this phase
            const projectedMaturityStage = this.projectMaturityStageAfterPhase(
                cumulativeScore,
                group.actions
            );

            // Build phase
            const phase = this.buildRoadmapPhase(
                sequenceOrder,
                group,
                baselineScore,
                cumulativeScore,
                phaseDelta,
                currentMaturityStage,
                projectedMaturityStage,
                phases.map(p => p.phaseId) // Prerequisites = all prior phases
            );

            phases.push(phase);
            currentMaturityStage = projectedMaturityStage;
        }

        return phases;
    }

    /**
     * Sort Actions by Sequencing Rules
     * 
     * Applies ROADMAP_SEQUENCING_RULES to order actions logically.
     */
    private sortActionsBySequencingRules(
        actions: GovernanceRemediationAction[]
    ): GovernanceRemediationAction[] {
        return [...actions].sort((a, b) => {
            // Rule 1: Severity priority (HIGH → MEDIUM → LOW)
            const severityDiff =
                ROADMAP_SEQUENCING_RULES.SEVERITY_PRIORITY[a.targetGapSeverity] -
                ROADMAP_SEQUENCING_RULES.SEVERITY_PRIORITY[b.targetGapSeverity];

            if (severityDiff !== 0) return severityDiff;

            // Rule 2: Action category priority (foundational → enforcement)
            const categoryDiff =
                ROADMAP_SEQUENCING_RULES.ACTION_CATEGORY_PRIORITY[a.actionCategory] -
                ROADMAP_SEQUENCING_RULES.ACTION_CATEGORY_PRIORITY[b.actionCategory];

            if (categoryDiff !== 0) return categoryDiff;

            // Rule 3: Risk level (LOW → MEDIUM → HIGH for tiebreaker)
            const riskOrder = { LOW: 1, MEDIUM: 2, HIGH: 3 };
            return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        });
    }

    /**
     * Group Actions into Phases
     * 
     * Groups sorted actions into logical phases based on:
     * - Severity boundaries (separate HIGH, MEDIUM, LOW)
     * - Action category clusters
     * - Risk distribution
     */
    private groupActionsIntoPhases(
        sortedActions: GovernanceRemediationAction[],
        gaps: ControlGap[]
    ): Array<{ actions: GovernanceRemediationAction[]; gaps: ControlGap[] }> {
        const groups: Array<{ actions: GovernanceRemediationAction[]; gaps: ControlGap[] }> = [];

        // Group by severity first
        const highActions = sortedActions.filter(a => a.targetGapSeverity === 'HIGH');
        const mediumActions = sortedActions.filter(a => a.targetGapSeverity === 'MEDIUM');
        const lowActions = sortedActions.filter(a => a.targetGapSeverity === 'LOW');

        // Create phases for each severity tier (if non-empty)
        if (highActions.length > 0) {
            groups.push({
                actions: highActions,
                gaps: gaps.filter(g => highActions.some(a => a.targetGapId === g.id)),
            });
        }

        if (mediumActions.length > 0) {
            groups.push({
                actions: mediumActions,
                gaps: gaps.filter(g => mediumActions.some(a => a.targetGapId === g.id)),
            });
        }

        if (lowActions.length > 0) {
            groups.push({
                actions: lowActions,
                gaps: gaps.filter(g => lowActions.some(a => a.targetGapId === g.id)),
            });
        }

        return groups;
    }

    /**
     * Build Roadmap Phase
     * 
     * Constructs complete roadmap phase from action group.
     */
    private buildRoadmapPhase(
        sequenceOrder: number,
        group: { actions: GovernanceRemediationAction[]; gaps: ControlGap[] },
        baselineScore: number,
        cumulativeScore: number,
        phaseDelta: number,
        stageBefore: GovernanceMaturityStage,
        stageAfter: GovernanceMaturityStage,
        prerequisitePhaseIds: string[]
    ): GovernanceRoadmapPhase {
        // Generate phase objective
        const objective = this.generatePhaseObjective(group.gaps, group.actions);

        // Map addressed gaps
        const addressedGaps: AddressedGapRef[] = sortGapsBySeverity(group.gaps).map(gap => ({
            gapId: gap.id,
            dimension: gap.dimension,
            severity: gap.severity,
            description: gap.description,
        }));

        // Map remediation actions
        const remediationActions: RemediationActionRef[] = group.actions.map(action => ({
            actionId: action.actionId,
            category: action.actionCategory,
            expectedDelta: action.expectedDimensionDelta,
            riskLevel: action.riskLevel,
        }));

        // Calculate score impact
        const scoreImpact: CumulativeScoreImpact = {
            baselineScore,
            cumulativeScore,
            cumulativeDelta: cumulativeScore - baselineScore,
            phaseDelta,
        };

        // Calculate maturity transition
        const maturityTransition: MaturityStageTransition = {
            stageBefore,
            stageAfter,
            transitionOccurred: stageBefore !== stageAfter,
            rationale: this.generateMaturityTransitionRationale(stageBefore, stageAfter, cumulativeScore),
        };

        // Calculate phase risk
        const phaseRisk = calculatePhaseRisk(group.actions.map(a => a.riskLevel));
        const riskNotes = this.generateRiskNotes(phaseRisk, group.actions);

        // Generate evidence references
        const evidenceReferences = this.generateEvidenceReferences(group.gaps);

        // Generate deterministic phase ID
        const phaseId = this.generatePhaseId(
            sequenceOrder,
            objective.title,
            addressedGaps.map(g => g.gapId)
        );

        return {
            phaseId,
            sequenceOrder,
            objective,
            addressedGaps,
            remediationActions,
            scoreImpact,
            maturityTransition,
            phaseRisk,
            riskNotes,
            evidenceReferences,
            prerequisitePhases: prerequisitePhaseIds,
        };
    }

    /**
     * Generate Phase Objective
     * 
     * Creates plain English objective for roadmap phase.
     */
    private generatePhaseObjective(
        gaps: ControlGap[],
        actions: GovernanceRemediationAction[]
    ): RoadmapPhaseObjective {
        const severity = gaps[0]?.severity || 'MEDIUM';
        const primaryDimensions = [...new Set(gaps.map(g => g.dimension))];

        // Generate title based on severity
        const severityTitles: Record<GapSeverity, string> = {
            HIGH: 'Critical Governance Foundations',
            MEDIUM: 'Core Governance Enhancements',
            LOW: 'Incremental Governance Improvements',
        };

        const title = severityTitles[severity];

        // Generate description
        const description =
            `Consider addressing ${severity.toLowerCase()} severity gaps in ` +
            `${primaryDimensions.slice(0, 2).join(' and ')} governance dimensions. ` +
            `This phase groups ${actions.length} remediation actions targeting ${gaps.length} control gaps.`;

        // Generate expected outcomes
        const expectedOutcomes = [
            `${severity} severity governance gaps closed`,
            `${primaryDimensions.length} governance dimensions improved`,
            `Cumulative score increase from remediation actions`,
        ];

        return {
            title,
            description,
            expectedOutcomes,
        };
    }

    /**
     * Project Maturity Stage After Phase
     * 
     * Determines expected maturity stage after completing phase.
     */
    private projectMaturityStageAfterPhase(
        cumulativeScore: number,
        actions: GovernanceRemediationAction[]
    ): GovernanceMaturityStage {
        const hasHighGaps = actions.some(a => a.targetGapSeverity === 'HIGH');

        // AUDIT_READY: No HIGH gaps + score ≥ 80
        if (!hasHighGaps && cumulativeScore >= 80) {
            return 'AUDIT_READY';
        }

        // GOVERNED: Score ≥ 60
        if (cumulativeScore >= 60) {
            return 'GOVERNED';
        }

        // STRUCTURED: Score ≥ 40
        if (cumulativeScore >= 40) {
            return 'STRUCTURED';
        }

        // FOUNDATIONAL: Baseline
        return 'FOUNDATIONAL';
    }

    /**
     * Generate Maturity Transition Rationale
     * 
     * Explains why maturity stage changed (or didn't).
     */
    private generateMaturityTransitionRationale(
        stageBefore: GovernanceMaturityStage,
        stageAfter: GovernanceMaturityStage,
        cumulativeScore: number
    ): string {
        if (stageBefore === stageAfter) {
            return `Maturity stage remains ${formatMaturityStage(stageBefore)} (score: ${cumulativeScore})`;
        }

        return (
            `Maturity progresses from ${formatMaturityStage(stageBefore)} to ` +
            `${formatMaturityStage(stageAfter)} (score: ${cumulativeScore})`
        );
    }

    /**
     * Generate Risk Notes
     * 
     * Explains phase risk assessment.
     */
    private generateRiskNotes(
        phaseRisk: RoadmapPhaseRisk,
        actions: GovernanceRemediationAction[]
    ): string[] {
        const notes: string[] = [];

        const highRiskCount = actions.filter(a => a.riskLevel === 'HIGH').length;
        const mediumRiskCount = actions.filter(a => a.riskLevel === 'MEDIUM').length;
        const lowRiskCount = actions.filter(a => a.riskLevel === 'LOW').length;

        notes.push(
            `Phase contains ${highRiskCount} HIGH, ${mediumRiskCount} MEDIUM, ${lowRiskCount} LOW risk actions`
        );

        if (phaseRisk === 'HIGH') {
            notes.push('HIGH risk phase requires careful planning and executive oversight');
        } else if (phaseRisk === 'MEDIUM') {
            notes.push('MEDIUM risk phase requires standard governance review');
        } else {
            notes.push('LOW risk phase suitable for streamlined implementation');
        }

        return notes;
    }

    /**
     * Generate Evidence References
     * 
     * Links phase to Sprint capabilities.
     */
    private generateEvidenceReferences(gaps: ControlGap[]): EvidenceReference[] {
        // Extract unique Sprint references from gap evidence
        const references: EvidenceReference[] = [];

        for (const gap of gaps) {
            for (const evidence of gap.evidence) {
                // Parse Sprint references from evidence strings
                const sprintMatch = evidence.match(/Sprint (\d+)/i);
                if (sprintMatch) {
                    const sprint = parseInt(sprintMatch[1], 10);
                    const capability = evidence.replace(/Sprint \d+:\s*/i, '').trim();

                    references.push({
                        sprint,
                        capability,
                        documentationRef: `SPRINT_${sprint}_*.md`,
                    });
                }
            }
        }

        // Deduplicate by sprint + capability
        return references.filter(
            (ref, index, self) =>
                index === self.findIndex(r => r.sprint === ref.sprint && r.capability === ref.capability)
        );
    }

    /**
     * Generate Deterministic Phase ID
     * 
     * Formula: SHA-256(sequenceOrder + objective.title + sorted_gapIds)
     */
    private generatePhaseId(sequenceOrder: number, objectiveTitle: string, gapIds: string[]): string {
        const hash = createHash('sha256');
        hash.update(sequenceOrder.toString());
        hash.update(objectiveTitle);
        hash.update(gapIds.sort().join(','));
        return hash.digest('hex');
    }

    /**
     * Generate Deterministic Roadmap ID
     * 
     * Formula: SHA-256(baselineMaturityStage + targetMaturityStage + phase_count + hour_truncated_timestamp)
     */
    private generateRoadmapId(
        baselineMaturityStage: GovernanceMaturityStage,
        targetMaturityStage: GovernanceMaturityStage,
        phaseCount: number
    ): string {
        const hash = createHash('sha256');
        hash.update(baselineMaturityStage);
        hash.update(targetMaturityStage);
        hash.update(phaseCount.toString());
        hash.update(truncateToHour(new Date().toISOString()));
        return hash.digest('hex');
    }

    /**
     * Calculate Roadmap Summary
     * 
     * Aggregate statistics about roadmap.
     */
    private calculateRoadmapSummary(
        phases: GovernanceRoadmapPhase[],
        baselineMaturityStage: GovernanceMaturityStage,
        targetMaturityStage: GovernanceMaturityStage,
        baselineScore: number,
        targetScore: number
    ): RoadmapSummary {
        const totalPhases = phases.length;
        const totalGapsAddressed = phases.reduce((sum, p) => sum + p.addressedGaps.length, 0);
        const totalActions = phases.reduce((sum, p) => sum + p.remediationActions.length, 0);
        const expectedScoreImprovement = targetScore - baselineScore;

        const phaseRiskCounts = phases.reduce(
            (counts, p) => {
                counts[p.phaseRisk.toLowerCase() as 'low' | 'medium' | 'high']++;
                return counts;
            },
            { low: 0, medium: 0, high: 0 }
        );

        return {
            totalPhases,
            totalGapsAddressed,
            totalActions,
            expectedScoreImprovement,
            expectedMaturityProgression: {
                from: baselineMaturityStage,
                to: targetMaturityStage,
            },
            phaseRiskDistribution: phaseRiskCounts,
        };
    }

    /**
     * Get Roadmap Assumptions
     * 
     * Explicit assumptions underlying roadmap synthesis.
     */
    private getRoadmapAssumptions(): RoadmapAssumption[] {
        return [
            {
                description: 'Phases are sequenced by static logic rules, not prioritization mandates',
                impactIfViolated: 'Different sequencing may be more appropriate for specific contexts',
            },
            {
                description: 'Roadmap assumes cumulative completion (no phase skipping)',
                impactIfViolated: 'Skipping phases may leave prerequisite gaps unaddressed',
            },
            {
                description: 'Score improvements assume remediation actions succeed as designed',
                impactIfViolated: 'Actual score improvements may differ from projections',
            },
            {
                description: 'Maturity stage transitions use static thresholds',
                impactIfViolated: 'Actual maturity assessment may differ from projections',
            },
            {
                description: 'Roadmap does not account for resource availability or timelines',
                impactIfViolated: 'Phases may not be feasible in projected sequence',
            },
        ];
    }

    /**
     * Get Roadmap Constraints
     * 
     * Explicit constraints limiting roadmap scope.
     */
    private getRoadmapConstraints(): RoadmapConstraint[] {
        return [
            {
                description: 'Roadmap is advisory only — does NOT mandate execution',
                mitigation: 'Require explicit executive authorization for each phase',
            },
            {
                description: 'Roadmap does NOT prescribe timelines or deadlines',
                mitigation: 'Develop separate timeline based on resource availability',
            },
            {
                description: 'Roadmap does NOT allocate resources or budget',
                mitigation: 'Conduct separate feasibility and resource planning',
            },
            {
                description: 'Roadmap does NOT authorize automation or enforcement',
                mitigation: 'Treat roadmap as planning input, not authorization',
            },
            {
                description: 'Roadmap is deterministic within 1-hour window only',
                mitigation: 'Regenerate roadmap if governance state changes significantly',
            },
        ];
    }
}
