import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import {
    IPayoutProvider,
    PayoutRequest,
    PayoutResult,
    PayoutVerification,
} from '../interfaces/payout-provider.interface';

@Injectable()
export class MockPayoutProvider implements IPayoutProvider {
    private readonly processedPayouts = new Map<string, PayoutResult>();

    getProviderName(): string {
        return 'MOCK';
    }

    async executePayout(request: PayoutRequest): Promise<PayoutResult> {
        // Idempotency: Check if already processed
        const existing = this.processedPayouts.get(request.withdrawalId);
        if (existing) {
            return existing;
        }

        // Simulate processing delay
        await this.delay(100);

        // Deterministic behavior based on withdrawal ID
        const result = this.determineOutcome(request);

        // Store for idempotency
        this.processedPayouts.set(request.withdrawalId, result);

        return result;
    }

    async verifyPayout(transactionId: string): Promise<PayoutVerification> {
        // Find payout by transaction ID
        for (const [withdrawalId, result] of this.processedPayouts.entries()) {
            if (result.transactionId === transactionId) {
                return {
                    status: result.success ? 'completed' : 'failed',
                    transactionId,
                    amount: new Decimal('0'), // Mock doesn't store amount
                };
            }
        }

        return {
            status: 'pending',
            transactionId,
            amount: new Decimal('0'),
        };
    }

    private determineOutcome(request: PayoutRequest): PayoutResult {
        const timestamp = new Date();

        // Deterministic logic: succeeds for most cases, fails for specific test scenarios
        const shouldFail =
            request.amount.lt(1) || // Amount too small
            request.bankAccount.includes('INVALID') || // Invalid account marker
            !request.accountHolder; // Missing required field

        if (shouldFail) {
            return {
                success: false,
                failureReason: this.getFailureReason(request),
                timestamp,
            };
        }

        // Success case
        const transactionId = `MOCK-TXN-${Date.now()}-${request.withdrawalId.substring(0, 8)}`;
        const providerReference = `MOCK-REF-${Date.now()}`;

        return {
            success: true,
            transactionId,
            providerReference,
            timestamp,
        };
    }

    private getFailureReason(request: PayoutRequest): string {
        if (request.amount.lt(1)) {
            return 'Amount too small for payout';
        }
        if (request.bankAccount.includes('INVALID')) {
            return 'Invalid bank account';
        }
        if (!request.accountHolder) {
            return 'Account holder name missing';
        }
        return 'Unknown payout failure';
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // Test helper method to clear processed payouts
    clearProcessedPayouts(): void {
        this.processedPayouts.clear();
    }
}
