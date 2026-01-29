/**
 * SkeletonLoader Component
 * 
 * Skeleton loaders for content that's being fetched.
 * Provides visual placeholders that match the content structure.
 * 
 * @example
 * // Product card skeleton
 * <ProductCardSkeleton />
 * 
 * // Multiple product cards
 * <ProductGridSkeleton count={8} />
 * 
 * // Text content skeleton
 * <TextSkeleton lines={3} />
 */

import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
}

/** Base skeleton element with pulse animation */
export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn('bg-muted animate-pulse rounded', className)}
            aria-hidden="true"
        />
    );
}

/** Skeleton for product cards */
export function ProductCardSkeleton() {
    return (
        <div className="border border-border rounded-lg p-4">
            <Skeleton className="aspect-square mb-4" />
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-3" />
            <Skeleton className="h-8 w-24" />
        </div>
    );
}

/** Skeleton grid for product listings */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <ProductCardSkeleton key={i} />
            ))}
        </div>
    );
}

/** Skeleton for text content */
export function TextSkeleton({ lines = 3 }: { lines?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={cn(
                        'h-4',
                        i === lines - 1 ? 'w-2/3' : 'w-full'
                    )}
                />
            ))}
        </div>
    );
}

/** Skeleton for stat cards (admin dashboard) */
export function StatCardSkeleton() {
    return (
        <div className="bg-background border border-border rounded-lg p-6">
            <div className="space-y-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
            </div>
        </div>
    );
}

/** Skeleton for table rows */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
    return (
        <tr>
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="p-4">
                    <Skeleton className="h-4 w-full" />
                </td>
            ))}
        </tr>
    );
}
