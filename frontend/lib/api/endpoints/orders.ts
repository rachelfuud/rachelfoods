/**
 * Orders API Endpoints
 * 
 * All order-related API calls
 */

import apiClient from '../client';

export interface Order {
    id: string;
    userId: string;
    status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
    paymentMethod: 'STRIPE' | 'COD';
    paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
    subtotal: number;
    discount: number;
    total: number;
    shippingAddress?: string;
    items: OrderItem[];
    coupon?: {
        code: string;
        discountAmount: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface OrderItem {
    id: string;
    productId: string;
    quantity: number;
    price: number;
    product?: {
        id: string;
        name: string;
        imageUrl?: string;
    };
}

export interface CreateOrderData {
    items: {
        productId: string;
        quantity: number;
    }[];
    paymentMethod: 'STRIPE' | 'COD';
    couponCode?: string;
    useWallet?: boolean;
    shippingAddress?: string;
}

export interface GetOrdersParams {
    page?: number;
    limit?: number;
    status?: Order['status'];
    paymentStatus?: Order['paymentStatus'];
    userId?: string;
}

export interface OrdersResponse {
    data: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const ordersEndpoints = {
    /**
     * USER: Get user's orders
     */
    getMyOrders: async (params?: GetOrdersParams): Promise<OrdersResponse> => {
        const { data } = await apiClient.get<OrdersResponse>('/orders/my-orders', { params });
        return data;
    },

    /**
     * USER: Get single order
     */
    getOrder: async (id: string): Promise<Order> => {
        const { data } = await apiClient.get<Order>(`/orders/${id}`);
        return data;
    },

    /**
     * USER: Create new order
     */
    createOrder: async (orderData: CreateOrderData): Promise<Order> => {
        const { data } = await apiClient.post<Order>('/orders', orderData);
        return data;
    },

    /**
     * USER: Cancel order
     */
    cancelOrder: async (id: string): Promise<Order> => {
        const { data } = await apiClient.patch<Order>(`/orders/${id}/cancel`);
        return data;
    },

    /**
     * ADMIN: Get all orders
     */
    getAdminOrders: async (params?: GetOrdersParams): Promise<OrdersResponse> => {
        const { data } = await apiClient.get<OrdersResponse>('/admin/orders', { params });
        return data;
    },

    /**
     * ADMIN: Update order status
     */
    updateOrderStatus: async (id: string, status: Order['status']): Promise<Order> => {
        const { data } = await apiClient.patch<Order>(`/admin/orders/${id}/status`, { status });
        return data;
    },

    /**
     * ADMIN: Process refund
     */
    refundOrder: async (id: string): Promise<Order> => {
        const { data } = await apiClient.post<Order>(`/admin/orders/${id}/refund`);
        return data;
    },
};
