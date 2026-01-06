import { Decimal } from '@prisma/client/runtime/library';

export interface FeeSnapshot {
    requestedAmount: Decimal;
    feeAmount: Decimal;
    netAmount: Decimal;
    policyType: string;
    percentage: Decimal | null;
    flatFee: Decimal | null;
    maxCap: Decimal | null;
    appliedAt: Date;
}

export interface WithdrawalPolicy {
    policyType: string;
    feePercentage: Decimal | null;
    flatFee: Decimal | null;
    maxCap: Decimal | null;
}
