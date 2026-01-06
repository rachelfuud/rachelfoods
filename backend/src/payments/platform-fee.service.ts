import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeeType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Fee calculation result
 */
export interface FeeCalculation {
    amount: Decimal;
    feeType: FeeType;
    feePercent: Decimal | null;
    appliedRule: string; // Rule name that was applied
}

/**
 * Fee calculation context
 */
export interface FeeCalculationContext {
    orderAmount: Decimal;
    categoryId?: string;
    sellerId?: string;
}

/**
 * PlatformFeeService
 * 
 * Calculates platform fees based on configurable rules in platform_fee_config.
 * 
 * FEE CALCULATION LOGIC:
 * 1. Query all active fee rules
 * 2. Filter rules matching context (category, seller, amount range)
 * 3. Apply highest priority matching rule
 * 4. Return fee amount and metadata
 * 
 * DEFAULT FEE:
 * If no rules match, applies default 2.5% fee.
 * 
 * RESPONSIBILITIES:
 * - Fee calculation (read-only)
 * - Rule matching and prioritization
 * - Default fee fallback
 * 
 * NOT RESPONSIBLE FOR:
 * - Creating ledger entries (use LedgerService)
 * - Recording fee collection (use PaymentService)
 * - Fee rule management (use admin APIs)
 */
@Injectable()
export class PlatformFeeService {
    private readonly logger = new Logger(PlatformFeeService.name);

    // Default fee: 2.5% of order amount
    private readonly DEFAULT_FEE_PERCENT = new Decimal(2.5);

    constructor(private prisma: PrismaService) { }

    /**
     * Calculate platform fee for an order
     * 
     * CALCULATION PRIORITY:
     * 1. Specific seller + category rules (highest priority)
     * 2. Seller-specific rules
     * 3. Category-specific rules
     * 4. Amount-range rules
     * 5. Default fee (2.5%)
     * 
     * @param context - Fee calculation context
     * @returns Fee calculation result
     */
    async calculateFee(context: FeeCalculationContext): Promise<FeeCalculation> {
        const { orderAmount, categoryId, sellerId } = context;

        // Get all active fee rules, ordered by priority
        const rules = await this.prisma.platform_fee_config.findMany({
            where: { isActive: true },
            orderBy: { priority: 'desc' }, // Higher priority first
        });

        // Find first matching rule
        for (const rule of rules) {
            if (this.ruleMatches(rule, context)) {
                const feeAmount = this.computeFeeAmount(
                    orderAmount,
                    rule.feeType,
                    rule.feeValue,
                );

                this.logger.debug(
                    `Applied fee rule '${rule.name}': ${feeAmount.toString()} (${rule.feeType})`,
                );

                return {
                    amount: feeAmount,
                    feeType: rule.feeType,
                    feePercent:
                        rule.feeType === FeeType.PERCENTAGE
                            ? rule.feeValue
                            : null,
                    appliedRule: rule.name,
                };
            }
        }

        // No matching rule - apply default fee
        const defaultFee = orderAmount
            .times(this.DEFAULT_FEE_PERCENT)
            .dividedBy(100);

        this.logger.debug(
            `Applied default fee: ${defaultFee.toString()} (${this.DEFAULT_FEE_PERCENT}%)`,
        );

        return {
            amount: defaultFee,
            feeType: FeeType.PERCENTAGE,
            feePercent: this.DEFAULT_FEE_PERCENT,
            appliedRule: 'Default Fee (2.5%)',
        };
    }

    /**
     * Check if a fee rule matches the given context
     * 
     * @private
     * @param rule - Fee rule to check
     * @param context - Calculation context
     * @returns true if rule matches, false otherwise
     */
    private ruleMatches(
        rule: {
            categoryId: string | null;
            sellerId: string | null;
            minAmount: Decimal | null;
            maxAmount: Decimal | null;
        },
        context: FeeCalculationContext,
    ): boolean {
        // Check category match (if rule specifies category)
        if (rule.categoryId && rule.categoryId !== context.categoryId) {
            return false;
        }

        // Check seller match (if rule specifies seller)
        if (rule.sellerId && rule.sellerId !== context.sellerId) {
            return false;
        }

        // Check amount range (if rule specifies min/max)
        if (rule.minAmount && context.orderAmount.lessThan(rule.minAmount)) {
            return false;
        }

        if (rule.maxAmount && context.orderAmount.greaterThan(rule.maxAmount)) {
            return false;
        }

        // All conditions match
        return true;
    }

    /**
     * Compute fee amount based on fee type and value
     * 
     * @private
     * @param orderAmount - Order total amount
     * @param feeType - PERCENTAGE, FLAT, or TIERED
     * @param feeValue - Fee value (percent or flat amount)
     * @returns Calculated fee amount
     */
    private computeFeeAmount(
        orderAmount: Decimal,
        feeType: FeeType,
        feeValue: Decimal,
    ): Decimal {
        switch (feeType) {
            case FeeType.PERCENTAGE:
                // feeValue is percentage (e.g., 2.5 means 2.5%)
                return orderAmount.times(feeValue).dividedBy(100);

            case FeeType.FLAT:
                // feeValue is fixed amount
                return feeValue;

            case FeeType.TIERED:
                // Not implemented in Sprint 6A
                throw new Error('TIERED fee type not yet implemented');

            default:
                throw new Error(`Unknown fee type: ${feeType}`);
        }
    }

    /**
     * Preview fee for an order (without recording)
     * 
     * Useful for showing fee estimate to buyer before checkout.
     * 
     * @param orderAmount - Order total
     * @param categoryId - Optional category ID
     * @param sellerId - Optional seller ID
     * @returns Fee calculation preview
     */
    async previewFee(
        orderAmount: Decimal,
        categoryId?: string,
        sellerId?: string,
    ): Promise<FeeCalculation> {
        return await this.calculateFee({
            orderAmount,
            categoryId,
            sellerId,
        });
    }
}
