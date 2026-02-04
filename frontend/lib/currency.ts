/**
 * Currency formatting utility
 * Centralizes all currency display logic for consistency
 */

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/**
 * Formats a numeric amount as USD currency
 * @param amount - The numeric amount in dollars to format
 * @returns Formatted currency string (e.g., "$12.00")
 */
export function formatCurrency(amount: number | string): string {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numericAmount)) {
        return '$0.00';
    }

    // Amount is already in dollars (from DECIMAL(10,2) database column)
    return currencyFormatter.format(numericAmount);
}
