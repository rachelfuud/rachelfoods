import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ShippingProvider } from './shipping-provider.interface';
import { InternalShippingProvider } from './internal-shipping.provider';
import { ThirdPartyShippingProvider } from './third-party-shipping.provider';
import { CustomShippingProvider } from './custom-shipping.provider';

export interface ShippingCalculation {
    provider: string;
    cost: number;
    distance: number;
    weight: number;
    isPerishable: boolean;
    canHandle: boolean;
}

export interface ShippingResult {
    selectedProvider: string;
    shippingCost: number;
    distance: number;
    weight: number;
    calculations: ShippingCalculation[];
}

/**
 * Shipping Engine
 * Central abstraction layer for all shipping operations
 * Enforces platform rules and normalizes provider responses
 */
@Injectable()
export class ShippingEngine {
    private readonly logger = new Logger(ShippingEngine.name);
    private providers: Map<string, ShippingProvider> = new Map();

    constructor(
        private readonly internalProvider: InternalShippingProvider,
        private readonly thirdPartyProvider: ThirdPartyShippingProvider,
        private readonly customProvider: CustomShippingProvider,
    ) {
        // Register all providers
        this.registerProvider('internal', this.internalProvider);
        this.registerProvider('3pl', this.thirdPartyProvider);
        this.registerProvider('custom', this.customProvider);
    }

    /**
     * Register a shipping provider
     */
    private registerProvider(key: string, provider: ShippingProvider): void {
        this.providers.set(key, provider);
        this.logger.log(`Registered shipping provider: ${provider.name}`);
    }

    /**
     * Calculate shipping cost for an order
     * @param distance Distance in kilometers
     * @param weight Total weight in kilograms
     * @param isPerishable Whether order contains perishable items
     * @param preferredProvider Optional preferred provider key
     * @returns Shipping calculation result with selected provider
     */
    async calculateShipping(
        distance: number,
        weight: number,
        isPerishable: boolean,
        preferredProvider?: string,
    ): Promise<ShippingResult> {
        if (distance <= 0 || weight <= 0) {
            throw new BadRequestException('Distance and weight must be positive values');
        }

        const calculations: ShippingCalculation[] = [];

        // Calculate cost for all enabled providers
        for (const [key, provider] of this.providers.entries()) {
            if (!provider.isEnabled) {
                continue;
            }

            try {
                const canHandle = await provider.canHandle(distance, weight);
                const cost = canHandle
                    ? await provider.calculateShipping(distance, weight, isPerishable)
                    : 0;

                calculations.push({
                    provider: key,
                    cost,
                    distance,
                    weight,
                    isPerishable,
                    canHandle,
                });

                this.logger.debug(
                    `Provider ${provider.name}: ${canHandle ? `₹${cost}` : 'Cannot handle'}`,
                );
            } catch (error) {
                this.logger.error(
                    `Error calculating shipping for provider ${provider.name}:`,
                    error,
                );
            }
        }

        // Select provider
        let selectedCalculation: ShippingCalculation | null = null;

        // 1. Try preferred provider first
        if (preferredProvider) {
            selectedCalculation = calculations.find(
                (c) => c.provider === preferredProvider && c.canHandle,
            ) || null;
        }

        // 2. Fallback to cheapest provider that can handle
        if (!selectedCalculation) {
            const validCalculations = calculations.filter((c) => c.canHandle && c.cost > 0);
            if (validCalculations.length > 0) {
                selectedCalculation = validCalculations.reduce((prev, current) =>
                    prev.cost < current.cost ? prev : current,
                );
            }
        }

        // 3. Final fallback to custom provider
        if (!selectedCalculation) {
            selectedCalculation = calculations.find((c) => c.provider === 'custom') || null;
        }

        if (!selectedCalculation) {
            throw new BadRequestException(
                'No shipping provider available for this delivery',
            );
        }

        this.logger.log(
            `Selected provider: ${selectedCalculation.provider} (₹${selectedCalculation.cost})`,
        );

        return {
            selectedProvider: selectedCalculation.provider,
            shippingCost: selectedCalculation.cost,
            distance,
            weight,
            calculations,
        };
    }

    /**
     * Get all available providers
     */
    getAvailableProviders(): string[] {
        return Array.from(this.providers.entries())
            .filter(([_, provider]) => provider.isEnabled)
            .map(([key, provider]) => `${key}:${provider.name}`);
    }

    /**
     * Enable/disable a provider
     */
    setProviderStatus(providerKey: string, enabled: boolean): void {
        const provider = this.providers.get(providerKey);
        if (provider) {
            provider.isEnabled = enabled;
            this.logger.log(
                `Provider ${provider.name} ${enabled ? 'enabled' : 'disabled'}`,
            );
        }
    }

    /**
     * Validate if any provider can handle the delivery
     */
    async canDeliver(distance: number, weight: number): Promise<boolean> {
        for (const provider of this.providers.values()) {
            if (provider.isEnabled && (await provider.canHandle(distance, weight))) {
                return true;
            }
        }
        return false;
    }
}
