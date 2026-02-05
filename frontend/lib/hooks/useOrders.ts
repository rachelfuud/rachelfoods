/**
 * React Query Hooks for Orders
 * 
 * Automatic caching, refetching, and loading states
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { ordersEndpoints, Order, GetOrdersParams, CreateOrderData } from '../api/endpoints/orders';

/**
 * Get user's orders
 */
export function useMyOrders(params?: GetOrdersParams, options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['orders', 'my-orders', params],
        queryFn: () => ordersEndpoints.getMyOrders(params),
        staleTime: 1 * 60 * 1000, // 1 minute
        ...options,
    });
}

/**
 * Get single order
 */
export function useOrder(id: string, options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['orders', id],
        queryFn: () => ordersEndpoints.getOrder(id),
        enabled: !!id,
        staleTime: 30 * 1000, // 30 seconds
        ...options,
    });
}

/**
 * Create new order
 */
export function useCreateOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (orderData: CreateOrderData) => ordersEndpoints.createOrder(orderData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders', 'my-orders'] });
        },
    });
}

/**
 * Cancel order
 */
export function useCancelOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => ordersEndpoints.cancelOrder(id),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['orders', data.id] });
            queryClient.invalidateQueries({ queryKey: ['orders', 'my-orders'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
        },
    });
}

/**
 * ADMIN: Get all orders
 */
export function useAdminOrders(params?: GetOrdersParams, options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['admin', 'orders', params],
        queryFn: () => ordersEndpoints.getAdminOrders(params),
        staleTime: 30 * 1000, // 30 seconds for admin
        ...options,
    });
}

/**
 * ADMIN: Update order status
 */
export function useUpdateOrderStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: Order['status'] }) =>
            ordersEndpoints.updateOrderStatus(id, status),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['orders', data.id] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
        },
    });
}

/**
 * ADMIN: Process refund
 */
export function useRefundOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => ordersEndpoints.refundOrder(id),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['orders', data.id] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
        },
    });
}
