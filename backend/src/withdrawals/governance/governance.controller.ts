/**
 * SPRINT 17 PHASE 1: Governance Controller
 * 
 * Purpose: Expose READ-ONLY governance readiness assessment for platform admins
 * 
 * Endpoint:
 * - GET /api/admin/governance/readiness
 * 
 * RBAC:
 * - Requires: PLATFORM_ADMIN only
 * 
 * Characteristics:
 * - READ-ONLY: No mutations, no enforcement
 * - Deterministic: Same data → same scores
 * - On-demand: Computed per request
 * - Audit-ready: Full rationale and evidence
 * 
 * Non-Goals:
 * - No policy enforcement
 * - No automated remediation
 * - No predictive modeling
 * - No behavior changes
 */

import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GovernanceReadinessService } from './governance-readiness.service';
import { GovernanceReadinessSnapshot } from './governance-readiness.types';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';

@ApiTags('Admin - Governance')
@Controller('api/admin/governance')
@UseGuards(AuthGuard, RoleGuard)
@Roles('PLATFORM_ADMIN') // Stricter: PLATFORM_ADMIN only
export class GovernanceController {
    private readonly logger = new Logger(GovernanceController.name);

    constructor(private readonly governanceService: GovernanceReadinessService) { }

    /**
     * GET /api/admin/governance/readiness
     * 
     * Generate governance readiness assessment across 6 dimensions:
     * 1. RISK_COVERAGE: Risk monitoring coverage
     * 2. ESCALATION_VISIBILITY: High-risk alert tracking
     * 3. ADMIN_DECISION_TRACEABILITY: Decision logging
     * 4. INCIDENT_RECONSTRUCTABILITY: Timeline reconstruction capability
     * 5. ALERT_SATURATION: Alert volume sustainability
     * 6. SIEM_EXPORT_READINESS: Compliance export capability
     * 
     * Returns:
     * - Overall readiness score (0-100)
     * - Readiness level (LOW/MEDIUM/HIGH)
     * - Per-dimension scores with rationale
     * - Warnings for low scores
     * 
     * RBAC: Requires PLATFORM_ADMIN role
     * 
     * Example:
     * GET /api/admin/governance/readiness
     */
    @Get('readiness')
    @ApiOperation({
        summary: 'Get governance readiness assessment',
        description:
            'Generate deterministic governance readiness scores across 6 dimensions. ' +
            'Evaluates system preparedness for stricter controls and regulatory scrutiny. ' +
            'READ-ONLY assessment with no enforcement or automation. ' +
            'Computed on-demand (not cached).',
    })
    @ApiResponse({
        status: 200,
        description: 'Governance readiness assessment generated',
        schema: {
            example: {
                generatedAt: '2026-01-05T16:00:00.000Z',
                windowHours: 24,
                overallScore: 83,
                readinessLevel: 'HIGH',
                dimensions: [
                    {
                        dimension: 'RISK_COVERAGE',
                        score: 100,
                        rationale: [
                            'Alert volume: 25 alerts in 24h',
                            'Sufficient risk monitoring coverage',
                        ],
                        evidence: [
                            'Sprint 16 Phase 2: Admin Alert System',
                            'Sprint 16 Phase 1: Risk Event Bus',
                            'Current alert count: 25',
                        ],
                    },
                    {
                        dimension: 'ESCALATION_VISIBILITY',
                        score: 85,
                        rationale: [
                            '11 of 13 HIGH/CRITICAL alerts linked to incidents',
                            'Strong escalation visibility',
                        ],
                        evidence: [
                            'Sprint 16 Phase 3: Alert Incident Correlation',
                            'Linked alerts: 11/13',
                            'Active incidents: 5',
                        ],
                    },
                    {
                        dimension: 'ADMIN_DECISION_TRACEABILITY',
                        score: 100,
                        rationale: [
                            '5 incidents provide decision tracking infrastructure',
                            'Sprint 14 Phase 3 admin decision capture available (not yet integrated)',
                        ],
                        evidence: [
                            'Sprint 14 Phase 3: Admin Decision Capture',
                            'Sprint 16 Phase 3: Alert Incident System',
                            'Incidents in window: 5',
                        ],
                    },
                    {
                        dimension: 'INCIDENT_RECONSTRUCTABILITY',
                        score: 100,
                        rationale: [
                            'Sprint 15 incident reconstruction service operational',
                            'Full timeline reconstruction capability available',
                            'Evidence-based forensic analysis enabled',
                        ],
                        evidence: [
                            'Sprint 15 Phase 1: Incident Reconstruction',
                            'Sprint 15 Phase 2: Compliance Narrative',
                            'Sprint 15 Phase 3: Incident Exports',
                            'Sprint 15 Phase 4: Forensic Bundles',
                        ],
                    },
                    {
                        dimension: 'ALERT_SATURATION',
                        score: 50,
                        rationale: [
                            'Alert volume: 75 alerts/hour',
                            'Saturation level: Warning',
                            'Approaching saturation threshold (50/hour)',
                        ],
                        evidence: [
                            'Sprint 16 Phase 2: Admin Alert System',
                            'Current rate: 75 alerts/hour',
                            'Warning threshold: 50/hour',
                            'Critical threshold: 100/hour',
                        ],
                    },
                    {
                        dimension: 'SIEM_EXPORT_READINESS',
                        score: 100,
                        rationale: [
                            'SIEM export service operational',
                            'Supports JSON and NDJSON formats',
                            'Compatible with Splunk, Elastic, Azure Sentinel',
                        ],
                        evidence: [
                            'Sprint 16 Phase 4: SIEM Export Service',
                            'Formats: JSON, NDJSON',
                            'Sources: Alerts, Incidents',
                        ],
                    },
                ],
                warnings: [
                    'ALERT_SATURATION: Medium score (50/100) - Review recommended',
                ],
                sprint: 'SPRINT_17_PHASE_1',
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have PLATFORM_ADMIN role',
    })
    async getReadiness(): Promise<GovernanceReadinessSnapshot> {
        this.logger.log('[SPRINT_17_PHASE_1] Governance readiness assessment requested');

        const snapshot = await this.governanceService.generateReadinessSnapshot();

        this.logger.log(
            `[SPRINT_17_PHASE_1] Governance readiness assessment returned (overallScore: ${snapshot.overallScore}, level: ${snapshot.readinessLevel}, warnings: ${snapshot.warnings.length})`,
        );

        return snapshot;
    }
}
