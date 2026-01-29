/**
 * LoadingSpinner Component
 * 
 * A consistent, reusable loading spinner with multiple size options.
 * Use this component throughout the app for consistent loading UX.
 * 
 * @example
 * // Small inline spinner
 * <LoadingSpinner size="sm" />
 * 
 * // Medium spinner with text
 * <LoadingSpinner size="md" text="Loading products..." />
 * 
 * // Large centered spinner
 * <LoadingSpinner size="lg" text="Please wait..." centered />
 */

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
    /** Size variant: sm (16px), md (32px), lg (64px) */
    size?: 'sm' | 'md' | 'lg';
    /** Optional loading text to display below spinner */
    text?: string;
    /** Center the spinner (adds flex container) */
    centered?: boolean;
    /** Additional CSS classes */
    className?: string;
}

const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-16 w-16 border-4',
};

export function LoadingSpinner({
    size = 'md',
    text,
    centered = false,
    className
}: LoadingSpinnerProps) {
    const spinner = (
        <>
            <div
                className={cn(
                    'animate-spin rounded-full border-t-primary border-b-primary border-r-transparent border-l-transparent',
                    sizeClasses[size],
                    className
                )}
                role="status"
                aria-label="Loading"
            />
            {text && (
                <p className={cn(
                    'text-foreground/70',
                    size === 'sm' ? 'text-sm mt-1' : size === 'md' ? 'text-base mt-2' : 'text-lg mt-4'
                )}>
                    {text}
                </p>
            )}
        </>
    );

    if (centered) {
        return (
            <div className="flex flex-col items-center justify-center">
                {spinner}
            </div>
        );
    }

    return text ? (
        <div className="flex flex-col items-center">
            {spinner}
        </div>
    ) : (
        <>{spinner}</>
    );
}
