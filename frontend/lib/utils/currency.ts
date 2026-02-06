/**
 * Currency Conversion Utilities
 * 
 * Backend stores prices in cents (e.g., 1000 = $10.00)
 * Frontend displays in dollars (e.g., $10.00)
 */

/**
 * Convert dollars to cents for backend storage
 * @param dollars - Price in dollars (e.g., 10.50)
 * @returns Price in cents (e.g., 1050)
 */
export function dollarsToCents(dollars: number): number {
    return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars for display
 * @param cents - Price in cents (e.g., 1050)
 * @returns Price in dollars (e.g., 10.50)
 */
export function centsToDollars(cents: number): number {
    return cents / 100;
}

/**
 * Format price in cents as currency string
 * @param cents - Price in cents
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string (e.g., "$10.50")
 */
export function formatPrice(cents: number, currency: string = 'USD'): string {
    const dollars = centsToDollars(cents);
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(dollars);
}

/**
 * Parse user input to cents
 * Handles various input formats: "10", "10.5", "$10.50"
 * @param input - User input string or number
 * @returns Price in cents
 */
export function parseInputToCents(input: string | number): number {
    if (typeof input === 'number') {
        return dollarsToCents(input);
    }

    // Remove currency symbols and whitespace
    const cleaned = input.replace(/[$,\s]/g, '');
    const dollars = parseFloat(cleaned) || 0;
    return dollarsToCents(dollars);
}
