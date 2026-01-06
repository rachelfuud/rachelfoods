import { Module } from '@nestjs/common';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalPolicyService } from './withdrawal-policy.service';
import { WithdrawalProcessingService } from './withdrawal-processing.service';
import { WithdrawalAutoProcessorService } from './withdrawal-auto-processor.service';
import { WithdrawalWebhookService } from './withdrawal-webhook.service';
import { WithdrawalMetricsService } from './withdrawal-metrics.service';
import { WithdrawalController } from './withdrawal.controller';
import { WithdrawalPolicyController } from './policy/withdrawal-policy.controller';
import { WithdrawalPolicyService as WithdrawalLimitPolicyService } from './policy/withdrawal-policy.service';
import { WithdrawalPolicyResolverService } from './policy/withdrawal-policy-resolver.service';
import { WithdrawalLimitEvaluatorService } from './policy/withdrawal-limit-evaluator.service';
import { WithdrawalPolicyInsightsService } from './policy/withdrawal-policy-insights.service';
import { WithdrawalPolicySimulationService } from './policy/withdrawal-policy-simulation.service';
import { WithdrawalRiskController } from './risk/withdrawal-risk.controller';
import { WithdrawalRiskService } from './risk/withdrawal-risk.service';
import { WithdrawalRiskEscalationService } from './risk/withdrawal-risk-escalation.service';
import { WithdrawalRiskVisibilityService } from './risk/withdrawal-risk-visibility.service';
import { WithdrawalRiskVisibilityController } from './risk/withdrawal-risk-visibility.controller';
import { WithdrawalRiskExportService } from './risk/withdrawal-risk-export.service';
import { WithdrawalRiskExportController } from './risk/withdrawal-risk-export.controller';
import { WithdrawalRiskPlaybookService } from './risk/withdrawal-risk-playbook.service';
import { WithdrawalRiskPlaybookController } from './risk/withdrawal-risk-playbook.controller';
import { WithdrawalIncidentReconstructionService } from './risk/withdrawal-incident-reconstruction.service';
import { WithdrawalIncidentReconstructionController } from './risk/withdrawal-incident-reconstruction.controller';
import { WithdrawalComplianceNarrativeService } from './incident/withdrawal-compliance-narrative.service';
import { WithdrawalComplianceNarrativeController } from './incident/withdrawal-compliance-narrative.controller';
import { WithdrawalIncidentExportService } from './incident/withdrawal-incident-export.service';
import { WithdrawalIncidentExportController } from './incident/withdrawal-incident-export.controller';
import { WithdrawalIncidentBundleService } from './incident/withdrawal-incident-bundle.service';
import { WithdrawalIncidentBundleController } from './incident/withdrawal-incident-bundle.controller';
import { WithdrawalRiskEventNormalizerService } from './risk-events/risk-event-normalizer.service';
import { WithdrawalRiskEventBusService } from './risk-events/risk-event-bus.service';
import { AdminAlertEngineService } from './alerts/admin-alert-engine.service';
import { AdminAlertService } from './alerts/admin-alert.service';
import { AdminAlertController } from './alerts/admin-alert.controller';
import { AlertCorrelationEngine } from './alerts/alert-correlation.engine';
import { AlertIncidentService } from './alerts/alert-incident.service';
import { AlertIncidentController } from './alerts/alert-incident.controller';
import { DashboardMetricsService } from './dashboard/dashboard-metrics.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { SiemExportService } from './siem/siem-export.service';
import { SiemExportController } from './siem/siem-export.controller';
import { GovernanceReadinessService } from './governance/governance-readiness.service';
import { GovernanceController } from './governance/governance.controller';
import { ControlGapService } from './governance/control-gap.service';
import { PolicySimulationService } from './governance/policy-simulation.service';
import { GovernanceSimulationController } from './governance/governance-simulation.controller';
import { AutomationReadinessService } from './governance/automation-readiness.service';
import { AutomationGuardrailsService } from './governance/automation-guardrails.service';
import { AutomationReadinessController } from './governance/automation-readiness.controller';
import { GovernanceAttestationService } from './governance/governance-attestation.service';
import { GovernanceAttestationController } from './governance/governance-attestation.controller';
import { PolicyEvaluationService } from './governance/policy-evaluation.service';
import { PolicyController } from './governance/policy.controller';
import { PolicySnapshotService } from './governance/policy-snapshot.service';
import { PolicyDriftService } from './governance/policy-drift.service';
import { PolicyDriftController } from './governance/policy-drift.controller';
import { GovernanceTimelineService } from './governance/governance-timeline.service';
import { GovernanceTimelineController } from './governance/governance-timeline.controller';
import { GovernanceAttributionService } from './governance/governance-attribution.service';
import { GovernanceAttributionController } from './governance/governance-attribution.controller';
import { GovernanceRemediationService } from './governance/governance-remediation.service';
import { GovernanceRemediationController } from './governance/governance-remediation.controller';
import { GovernanceRoadmapService } from './governance/governance-roadmap.service';
import { GovernanceRoadmapController } from './governance/governance-roadmap.controller';
import { GovernanceEvidenceLedgerService } from './governance/governance-evidence-ledger.service';
import { GovernanceEvidenceLedgerController } from './governance/governance-evidence-ledger.controller';
import { GovernanceEvidenceExportService } from './governance/governance-evidence-export.service';
import { GovernanceEvidenceExportController } from './governance/governance-evidence-export.controller';
import { GovernanceEvidenceViewService } from './governance/governance-evidence-view.service';
import { GovernanceEvidenceViewController } from './governance/governance-evidence-view.controller';
import { WithdrawalApprovalContextService } from './approval/withdrawal-approval-context.service';
import { AdaptiveWithdrawalLimitService } from './adaptive/adaptive-withdrawal-limit.service';
import { WithdrawalCoolingPeriodService } from './cooling/withdrawal-cooling-period.service';
import { WithdrawalTransitionGuardService } from './guards/withdrawal-transition-guard.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { MockPayoutProvider } from './providers/mock-payout.provider';

@Module({
    imports: [PrismaModule, PaymentsModule, WebhooksModule],
    controllers: [
        WithdrawalController,
        WithdrawalPolicyController,
        WithdrawalRiskController,
        WithdrawalRiskVisibilityController,
        WithdrawalRiskExportController,
        WithdrawalRiskPlaybookController,
        WithdrawalIncidentReconstructionController,
        WithdrawalComplianceNarrativeController,
        WithdrawalIncidentExportController,
        WithdrawalIncidentBundleController,
        AdminAlertController,
        AlertIncidentController,
        DashboardController,
        SiemExportController,
        GovernanceController,
        GovernanceSimulationController,
        AutomationReadinessController,
        GovernanceAttestationController,
        PolicyController,
        PolicyDriftController,
        GovernanceTimelineController,
        GovernanceAttributionController,
        GovernanceRemediationController,
        GovernanceRoadmapController,
        GovernanceEvidenceLedgerController,
        GovernanceEvidenceExportController,
        GovernanceEvidenceViewController,
    ],
    providers: [
        WithdrawalService,
        WithdrawalPolicyService,
        WithdrawalProcessingService,
        WithdrawalAutoProcessorService,
        WithdrawalWebhookService,
        WithdrawalMetricsService,
        MockPayoutProvider,
        WithdrawalLimitPolicyService,
        WithdrawalPolicyResolverService,
        WithdrawalLimitEvaluatorService,
        WithdrawalPolicyInsightsService,
        WithdrawalPolicySimulationService,
        WithdrawalRiskService,
        WithdrawalRiskEscalationService,
        WithdrawalRiskVisibilityService,
        WithdrawalRiskExportService,
        WithdrawalRiskPlaybookService,
        WithdrawalIncidentReconstructionService,
        WithdrawalComplianceNarrativeService,
        WithdrawalIncidentExportService,
        WithdrawalIncidentBundleService,
        WithdrawalRiskEventNormalizerService,
        WithdrawalRiskEventBusService,
        AdminAlertEngineService,
        AdminAlertService,
        AlertCorrelationEngine,
        AlertIncidentService,
        DashboardMetricsService,
        SiemExportService,
        GovernanceReadinessService,
        ControlGapService,
        PolicySimulationService,
        AutomationReadinessService,
        AutomationGuardrailsService,
        GovernanceAttestationService,
        PolicyEvaluationService,
        PolicySnapshotService,
        PolicyDriftService,
        GovernanceTimelineService,
        GovernanceAttributionService,
        GovernanceRemediationService,
        GovernanceRoadmapService,
        GovernanceEvidenceLedgerService,
        GovernanceEvidenceExportService,
        GovernanceEvidenceViewService,
        WithdrawalApprovalContextService,
        AdaptiveWithdrawalLimitService,
        WithdrawalCoolingPeriodService,
        WithdrawalTransitionGuardService,
    ],
    exports: [WithdrawalService, WithdrawalProcessingService],
})
export class WithdrawalModule { }
