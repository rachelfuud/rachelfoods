import { Module } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { ValidationService } from './validation.service';
import { SettlementService } from './settlement.service';
import { AuditService } from './audit.service';
import { FinancialOpsController } from './financial-ops.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
    imports: [PrismaModule, PaymentsModule],
    controllers: [FinancialOpsController],
    providers: [ReconciliationService, ValidationService, SettlementService, AuditService],
    exports: [ReconciliationService, ValidationService, SettlementService, AuditService],
})
export class FinancialOpsModule { }
