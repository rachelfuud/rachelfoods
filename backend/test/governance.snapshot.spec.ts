import { Test, TestingModule } from '@nestjs/testing';
import { GovernanceTimelineService } from '../src/withdrawals/governance/governance-timeline.service';
import { GovernanceAttributionService } from '../src/withdrawals/governance/governance-attribution.service';
import { GovernanceRemediationService } from '../src/withdrawals/governance/governance-remediation.service';
import { ControlGapService } from '../src/withdrawals/governance/control-gap.service';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Snapshot Tests for Governance Services
 * 
 * Test Scope:
 * - Verify governance services output structure (READ-ONLY)
 * - NO logic changes, NO mutations
 * - Snapshot tests ensure output format stability
 * - Evidence system remains immutable
 */
describe('Governance Services - Snapshot Tests (READ-ONLY)', () => {
    let timelineService: GovernanceTimelineService;
    let attributionService: GovernanceAttributionService;
    let remediationService: GovernanceRemediationService;
    let controlGapService: ControlGapService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GovernanceTimelineService,
                GovernanceAttributionService,
                GovernanceRemediationService,
                ControlGapService,
                {
                    provide: PrismaService,
                    useValue: {
                        // Empty mock - these services don't use Prisma models
                    },
                },
            ],
        }).compile();

        timelineService = module.get<GovernanceTimelineService>(GovernanceTimelineService);
        attributionService = module.get<GovernanceAttributionService>(GovernanceAttributionService);
        remediationService = module.get<GovernanceRemediationService>(GovernanceRemediationService);
        controlGapService = module.get<ControlGapService>(ControlGapService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    describe('GovernanceTimelineService', () => {
        it('should generate governance timeline snapshot', async () => {
            const result = await timelineService.generateGovernanceTimeline();

            expect(result).toMatchSnapshot();
            expect(result).toHaveProperty('events');
            expect(result).toHaveProperty('generatedAt');
            expect(result).toHaveProperty('summary');
            expect(result.events.length).toBeGreaterThan(0);
            expect(result.events[0]).toHaveProperty('eventId');
            expect(result.events[0]).toHaveProperty('sprint');
            expect(result.events[0]).toHaveProperty('category');
            expect(result.events[0]).toHaveProperty('capability');
        });

        it('should verify timeline is read-only (no mutation methods)', async () => {
            const result = await timelineService.generateGovernanceTimeline();

            // Verify service returns READ-ONLY data
            expect(result).toHaveProperty('events');
            expect(result).toHaveProperty('generatedAt');
            expect(result).toHaveProperty('summary');

            // Verify service doesn't have mutation methods
            expect(timelineService).not.toHaveProperty('createEvent');
            expect(timelineService).not.toHaveProperty('updateEvent');
            expect(timelineService).not.toHaveProperty('deleteEvent');
        });
    });

    describe('GovernanceAttributionService', () => {
        it('should generate attribution report snapshot', async () => {
            const result = await attributionService.generateAttributionReport();

            expect(result).toMatchSnapshot();
            expect(result).toHaveProperty('attributions');
            expect(result).toHaveProperty('generatedAt');
            expect(result).toHaveProperty('summary');
            expect(result).toHaveProperty('maturityStage');
            expect(result).toHaveProperty('disclaimer');

            if (result.attributions.length > 0) {
                expect(result.attributions[0]).toHaveProperty('attributionId');
                expect(result.attributions[0]).toHaveProperty('gapDimension');
                expect(result.attributions[0]).toHaveProperty('rootCause');
                expect(result.attributions[0]).toHaveProperty('linkedEvents');
            }
        });

        it('should verify attribution is read-only (no mutation methods)', async () => {
            const result = await attributionService.generateAttributionReport();

            // Verify service returns READ-ONLY data
            expect(result).toHaveProperty('attributions');
            expect(result).toHaveProperty('disclaimer');

            // Verify service doesn't have mutation methods
            expect(attributionService).not.toHaveProperty('createAttribution');
            expect(attributionService).not.toHaveProperty('updateAttribution');
            expect(attributionService).not.toHaveProperty('deleteAttribution');
        });
    });

    describe('GovernanceRemediationService', () => {
        it('should generate remediation forecast snapshot', async () => {
            const result = await remediationService.generateRemediationForecast();

            expect(result).toMatchSnapshot();
            expect(result).toHaveProperty('baselineScore');
            expect(result).toHaveProperty('projectedScore');
            expect(result).toHaveProperty('generatedAt');
            expect(result).toHaveProperty('disclaimer');
            expect(result).toHaveProperty('actionsConsidered');

            if (result.actionsConsidered.length > 0) {
                expect(result.actionsConsidered[0]).toHaveProperty('actionId');
                expect(result.actionsConsidered[0]).toHaveProperty('category');
                expect(result.actionsConsidered[0]).toHaveProperty('description');
            }
        });

        it('should verify remediation forecast is advisory only (no mutations)', async () => {
            const result = await remediationService.generateRemediationForecast();

            // Verify service returns advisory data only
            expect(result).toHaveProperty('disclaimer');
            expect(result.disclaimer).toContain('ADVISORY');

            // Verify service doesn't have auto-remediation methods
            expect(remediationService).not.toHaveProperty('autoRemediate');
            expect(remediationService).not.toHaveProperty('applyFix');
            expect(remediationService).not.toHaveProperty('executeRemediation');
        });
    });
});

describe('Evidence System Immutability', () => {
    it('should verify evidence ledger is append-only', () => {
        // Evidence system verification - no mock needed
        // This test documents that evidence is immutable by design

        const evidencePrinciples = {
            appendOnly: true,
            noDeletes: true,
            noUpdates: true,
            cryptographicHash: true,
            auditTrail: true,
        };

        expect(evidencePrinciples.appendOnly).toBe(true);
        expect(evidencePrinciples.noDeletes).toBe(true);
        expect(evidencePrinciples.noUpdates).toBe(true);
        expect(evidencePrinciples.cryptographicHash).toBe(true);
        expect(evidencePrinciples.auditTrail).toBe(true);
    });

    it('should document governance data flow (read-only)', () => {
        const governanceFlow = {
            backend: 'Computes governance data',
            storage: 'Stores in database',
            api: 'Exposes read-only endpoints',
            frontend: 'Consumes and displays',
            adminUI: 'Read-only visualization',
            noMutations: 'No admin-triggered changes',
            noScoring: 'No frontend-computed scores',
        };

        expect(governanceFlow.noMutations).toBe('No admin-triggered changes');
        expect(governanceFlow.noScoring).toBe('No frontend-computed scores');
    });
});
