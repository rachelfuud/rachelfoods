import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { FeeSnapshot, WithdrawalPolicy } from './interfaces/fee-snapshot.interface';

@Injectable()
export class WithdrawalPolicyService {
    resolvePolicy(role: string): WithdrawalPolicy {
        switch (role) {
            case 'BUYER':
            case 'CUSTOMER':
                return {
                    policyType: 'STANDARD_USER',
                    feePercentage: new Decimal('2.5'),
                    flatFee: new Decimal('10.00'),
                    maxCap: new Decimal('100.00'),
                };
            case 'SELLER':
            case 'VENDOR':
                return {
                    policyType: 'SELLER',
                    feePercentage: new Decimal('1.5'),
                    flatFee: new Decimal('5.00'),
                    maxCap: new Decimal('50.00'),
                };
            case 'DELIVERY_AGENT':
            case 'AGENT':
                return {
                    policyType: 'AGENT',
                    feePercentage: new Decimal('1.0'),
                    flatFee: null,
                    maxCap: new Decimal('25.00'),
                };
            case 'PLATFORM_ADMIN':
            case 'ADMIN':
                return {
                    policyType: 'ADMIN_ZERO_FEE',
                    feePercentage: new Decimal('0'),
                    flatFee: null,
                    maxCap: null,
                };
            default:
                return {
                    policyType: 'DEFAULT',
                    feePercentage: new Decimal('3.0'),
                    flatFee: new Decimal('15.00'),
                    maxCap: new Decimal('150.00'),
                };
        }
    }

    computeFeeSnapshot(requestedAmount: Decimal, policy: WithdrawalPolicy): FeeSnapshot {
        let feeAmount = new Decimal('0');

        if (policy.feePercentage && policy.feePercentage.gt(0)) {
            feeAmount = requestedAmount.mul(policy.feePercentage).div(100);
        }

        if (policy.flatFee) {
            feeAmount = feeAmount.add(policy.flatFee);
        }

        if (policy.maxCap && feeAmount.gt(policy.maxCap)) {
            feeAmount = policy.maxCap;
        }

        const netAmount = requestedAmount.sub(feeAmount);

        return {
            requestedAmount,
            feeAmount,
            netAmount,
            policyType: policy.policyType,
            percentage: policy.feePercentage,
            flatFee: policy.flatFee,
            maxCap: policy.maxCap,
            appliedAt: new Date(),
        };
    }
}
