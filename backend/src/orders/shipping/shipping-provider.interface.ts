export interface ShippingProvider {
    name: string;
    isEnabled: boolean;

    /**
     * Calculate shipping cost based on distance and weight
     * @param distance Distance in kilometers
     * @param weight Total weight in kilograms
     * @param isPerishable Whether order contains perishable items
     * @returns Shipping cost in currency units
     */
    calculateShipping(distance: number, weight: number, isPerishable: boolean): Promise<number>;

    /**
     * Validate if provider can handle this delivery
     * @param distance Distance in kilometers
     * @param weight Total weight in kilograms
     * @returns true if provider can handle delivery
     */
    canHandle(distance: number, weight: number): Promise<boolean>;
}
