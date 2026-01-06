import { Injectable } from '@nestjs/common';
import { ShippingProvider } from './shipping-provider.interface';

/**
 * Custom Shipping Provider
 * For special arrangements, custom routes, or manual shipping
 * Seller can set custom rates
 */
@Injectable()
export class CustomShippingProvider implements ShippingProvider {
    name = 'Custom';
    isEnabled = true;

    // Default pricing (can be overridden by seller)
    private readonly DEFAULT_COST = 100;

    async calculateShipping(
        distance: number,
        weight: number,
        isPerishable: boolean,
    ): Promise<number> {
        // Custom shipping always returns default cost
        // Seller expected to override this manually
        return this.DEFAULT_COST;
    }

    async canHandle(distance: number, weight: number): Promise<boolean> {
        // Custom provider can handle any delivery
        return true;
    }
}
