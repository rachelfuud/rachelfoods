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
 * @param amount - The price amount (can be cents or dollars depending on source)
 * @returns Formatted currency string (e.g., "$12.00")
 */
export function formatCurrency(amount: number | string): string {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numericAmount)) {
        return '$0.00';
    }

    // Backend returns prices from DECIMAL(10,2) column which are already in dollars
    // (e.g., 10.50 from database = $10.50)
    // If the value is very large (> 1000), it might be in cents, so convert
    const dollars = numericAmount > 1000 ? numericAmount / 100 : numericAmount;

    return currencyFormatter.format(dollars);
}
