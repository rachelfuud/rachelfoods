/**
 * Centralized lazy loading configuration for heavy components
 * This improves initial page load performance by code-splitting large components
 * 
 * Note: Only includes components that actually exist in the codebase.
 * Add more as needed when new heavy components are created.
 */

import React from 'react';
import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/**
 * Lazy-loaded ProductCard for catalog/grid views
 * Use for: Catalog pages, search results, kitchen refill
 */
export const LazyProductCard = dynamic(
    () => import('@/components/ProductCard').then((mod) => ({ default: mod.ProductCard })),
    {
        loading: () => (
            <div className="animate-pulse bg-gray-100 h-96 rounded-lg" />
        ),
        ssr: false, // Client-side only for better performance
    }
);

/**
 * Performance monitoring utility
 * Log lazy loading metrics in development
 */
export function logLazyLoadMetric(componentName: string, loadTime: number) {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Lazy Load] ${componentName} loaded in ${loadTime}ms`);
    }
}
