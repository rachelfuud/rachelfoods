/**
 * Currency formatting utility
 * Centralizes all currency display logic for consistency
 * 
 * IMPORTANT: Backend stores prices in cents (e.g., 1000 = $10.00)
 * This function converts cents to dollars for display
 */

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/**
 * Formats a price amount as USD currency
 * @param amount - The price amount in dollars (from DECIMAL(10,2) column)
 * @returns Formatted currency string (e.g., "$12.00")
 */
export function formatCurrency(amount: number | string): string {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numericAmount)) {
        return '$0.00';
    }

    // Backend stores prices in DECIMAL(10,2) format which are already in dollars
    // (e.g., 10.50 from database = $10.50, 1500.00 = $1500.00)
    // No conversion needed - just format directly
    return currencyFormatter.format(numericAmount);
}
