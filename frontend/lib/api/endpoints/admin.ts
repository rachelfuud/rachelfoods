/**
 * Admin API Endpoints
 * 
 * System administration and business intelligence endpoints
 */

import apiClient from '../client';

export interface SystemHealth {
    status: 'healthy' | 'degraded' | 'unhealthy';
    database: boolean;
    cache: boolean;
    uptime: number;
    timestamp: string;
}

export interface OrderMetrics {
    totalOrders: number;
    pendingOrders: number;
    confirmedOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
}

export interface ProductMetrics {
    totalProducts: number;
    publishedProducts: number;
    draftProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
}

export interface TopProduct {
    id: string;
    name: string;
    totalOrders: number;
    totalRevenue: number;
    averageRating?: number;
}

export interface CustomerRetention {
    totalCustomers: number;
    returningCustomers: number;
    retentionRate: number;
    averageOrdersPerCustomer: number;
}

export interface RefillAnalytics {
    totalRefills: number;
    topRefilledProducts: {
        productId: string;
        productName: string;
        refillCount: number;
    }[];
    refillRate: number;
}

export const adminEndpoints = {
    /**
     * Get system health
     */
    getSystemHealth: async (): Promise<SystemHealth> => {
        const { data } = await apiClient.get<SystemHealth>('/admin/system/health');
        return data;
    },

    /**
     * Get order metrics
     */
    getOrderMetrics: async (): Promise<OrderMetrics> => {
        const { data } = await apiClient.get<OrderMetrics>('/admin/metrics/orders');
        return data;
    },

    /**
     * Get product metrics
     */
    getProductMetrics: async (): Promise<ProductMetrics> => {
        const { data } = await apiClient.get<ProductMetrics>('/admin/metrics/products');
        return data;
    },

    /**
     * Get top selling products
     */
    getTopProducts: async (limit: number = 10): Promise<TopProduct[]> => {
        const { data } = await apiClient.get<TopProduct[]>('/admin/business-intelligence/top-products', {
            params: { limit },
        });
        return data;
    },

    /**
     * Get customer retention metrics
     */
    getCustomerRetention: async (): Promise<CustomerRetention> => {
        const { data } = await apiClient.get<CustomerRetention>('/admin/business-intelligence/customer-retention');
        return data;
    },

    /**
     * Get refill analytics
     */
    getRefillAnalytics: async (): Promise<RefillAnalytics> => {
        const { data } = await apiClient.get<RefillAnalytics>('/admin/refill/analytics');
        return data;
    },

    /**
     * Get cache statistics
     */
    getCacheStats: async (): Promise<{ hits: number; misses: number; size: number }> => {
        const { data } = await apiClient.get('/admin/cache/stats');
        return data;
    },

    /**
     * Clear cache
     */
    clearCache: async (): Promise<{ cleared: boolean }> => {
        const { data } = await apiClient.post('/admin/cache/clear');
        return data;
    },
};
