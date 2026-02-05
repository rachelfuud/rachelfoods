/**
 * React Query Hooks for Admin
 * 
 * System administration and business intelligence
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tantml:react-query';
import { adminEndpoints } from '../api/endpoints/admin';

/**
 * Get system health
 */
export function useSystemHealth(options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['admin', 'system', 'health'],
        queryFn: () => adminEndpoints.getSystemHealth(),
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: 60 * 1000, // Refetch every minute
        ...options,
    });
}

/**
 * Get order metrics
 */
export function useOrderMetrics(options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['admin', 'metrics', 'orders'],
        queryFn: () => adminEndpoints.getOrderMetrics(),
        staleTime: 1 * 60 * 1000, // 1 minute
        ...options,
    });
}

/**
 * Get product metrics
 */
export function useProductMetrics(options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['admin', 'metrics', 'products'],
        queryFn: () => adminEndpoints.getProductMetrics(),
        staleTime: 1 * 60 * 1000,
        ...options,
    });
}

/**
 * Get top selling products
 */
export function useTopProducts(limit: number = 10, options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['admin', 'business-intelligence', 'top-products', limit],
        queryFn: () => adminEndpoints.getTopProducts(limit),
        staleTime: 5 * 60 * 1000, // 5 minutes
        ...options,
    });
}

/**
 * Get customer retention metrics
 */
export function useCustomerRetention(options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['admin', 'business-intelligence', 'customer-retention'],
        queryFn: () => adminEndpoints.getCustomerRetention(),
        staleTime: 5 * 60 * 1000,
        ...options,
    });
}

/**
 * Get refill analytics
 */
export function useRefillAnalytics(options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['admin', 'refill', 'analytics'],
        queryFn: () => adminEndpoints.getRefillAnalytics(),
        staleTime: 5 * 60 * 1000,
        retry: false, // May not exist yet
        ...options,
    });
}

/**
 * Get cache statistics
 */
export function useCacheStats(options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['admin', 'cache', 'stats'],
        queryFn: () => adminEndpoints.getCacheStats(),
        staleTime: 30 * 1000,
        ...options,
    });
}

/**
 * Clear cache
 */
export function useClearCache() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => adminEndpoints.clearCache(),
        onSuccess: () => {
            // Invalidate all queries after cache clear
            queryClient.invalidateQueries();
        },
    });
}
