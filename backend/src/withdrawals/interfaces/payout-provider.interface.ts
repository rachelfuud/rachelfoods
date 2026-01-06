import { Decimal } from '@prisma/client/runtime/library';

export interface PayoutRequest {
    withdrawalId: string;
    amount: Decimal;
    currency: string;
    bankAccount: string;
    accountHolder: string;
    bankName?: string;
    ifscCode?: string;
}

export interface PayoutResult {
    success: boolean;
    transactionId?: string;
    providerReference?: string;
    failureReason?: string;
    timestamp: Date;
}

export interface PayoutVerification {
    status: 'pending' | 'completed' | 'failed';
    transactionId: string;
    amount: Decimal;
}

export interface IPayoutProvider {
    executePayout(request: PayoutRequest): Promise<PayoutResult>;
    verifyPayout(transactionId: string): Promise<PayoutVerification>;
    getProviderName(): string;
}
