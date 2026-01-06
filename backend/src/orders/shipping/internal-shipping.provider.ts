import { Injectable } from '@nestjs/common';
import { ShippingProvider } from './shipping-provider.interface';

/**
 * Internal Shipping Provider
 * Uses RachelFoods delivery agents
 * Simple distance + weight based calculation
 */
@Injectable()
export class InternalShippingProvider implements ShippingProvider {
    name = 'Internal';
    isEnabled = true;

    // Pricing configuration
    private readonly BASE_COST = 30; // Base delivery fee
    private readonly COST_PER_KM = 2; // Cost per kilometer
    private readonly COST_PER_KG = 5; // Cost per kilogram
    private readonly PERISHABLE_SURCHARGE = 20; // Additional cost for perishable items

    // Service limits
    private readonly MAX_DISTANCE_KM = 50; // Maximum delivery distance
    private readonly MAX_WEIGHT_KG = 100; // Maximum weight capacity

    async calculateShipping(
        distance: number,
        weight: number,
        isPerishable: boolean,
    ): Promise<number> {
        let cost = this.BASE_COST;

        // Add distance-based cost
        cost += distance * this.COST_PER_KM;

        // Add weight-based cost
        cost += weight * this.COST_PER_KG;

        // Add perishable surcharge if applicable
        if (isPerishable) {
            cost += this.PERISHABLE_SURCHARGE;
        }

        return Math.round(cost * 100) / 100; // Round to 2 decimal places
    }

    async canHandle(distance: number, weight: number): Promise<boolean> {
        return distance <= this.MAX_DISTANCE_KM && weight <= this.MAX_WEIGHT_KG;
    }
}
