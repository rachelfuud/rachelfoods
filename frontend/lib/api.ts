/**
 * CRITICAL: PATH CONSTRUCTION PATTERN
 * 
 * NEXT_PUBLIC_API_URL should NEVER include the /api suffix.
 * This file automatically appends /api to construct the full API base URL.
 * 
 * ✅ CORRECT:   NEXT_PUBLIC_API_URL=https://backend.example.com
 * ❌ INCORRECT: NEXT_PUBLIC_API_URL=https://backend.example.com/api
 * 
 * Failing to follow this pattern results in double /api/api/ paths.
 * 
 * Files that must follow this pattern:
 * - .env.production
 * - .env.local
 * - .env.example
 * - .env.local.example
 * - next.config.js (env fallback)
 * - Any component using NEXT_PUBLIC_API_URL directly
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : 'http://localhost:3001/api';

// Debug: log the API URL being used
if (typeof window !== 'undefined') {
    console.log('API_BASE:', API_BASE);
    console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
}

export const api = {
    // Theme
    getTheme: async () => {
        const res = await fetch(`${API_BASE}/theme`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch theme');
        return res.json();
    },

    // Auth
    register: async (data: { email: string; password: string; fullName: string }) => {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Registration failed');
        return res.json();
    },

    login: async (data: { email: string; password: string }) => {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Login failed');
        return res.json();
    },

    // Categories
    getCategories: async () => {
        const res = await fetch(`${API_BASE}/categories`, { next: { revalidate: 60 } });
        if (!res.ok) throw new Error('Failed to fetch categories');
        return res.json();
    },

    // Products
    getProducts: async (categorySlug?: string) => {
        if (categorySlug) {
            // Fetch category with its products (already filtered to ACTIVE by backend)
            const res = await fetch(`${API_BASE}/categories/slug/${categorySlug}`, { next: { revalidate: 60 } });
            if (!res.ok) throw new Error('Failed to fetch category products');
            const category = await res.json();
            return category.products || [];
        }
        // Fetch all products (backend returns ACTIVE only by default)
        const res = await fetch(`${API_BASE}/products`, { next: { revalidate: 60 } });
        if (!res.ok) throw new Error('Failed to fetch products');
        return res.json();
    },

    getProduct: async (slug: string) => {
        const res = await fetch(`${API_BASE}/products/slug/${slug}`, { next: { revalidate: 60 } });
        if (!res.ok) throw new Error('Failed to fetch product');
        return res.json();
    },

    getFeaturedProducts: async () => {
        const res = await fetch(`${API_BASE}/products/featured`, { next: { revalidate: 60 } });
        if (!res.ok) throw new Error('Failed to fetch featured products');
        return res.json();
    },

    getPopularProducts: async (limit = 6) => {
        const res = await fetch(`${API_BASE}/products/popular?limit=${limit}`, { next: { revalidate: 60 } });
        if (!res.ok) throw new Error('Failed to fetch popular products');
        return res.json();
    },

    searchProducts: async (query: string) => {
        const res = await fetch(`${API_BASE}/products/search?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to search products');
        return res.json();
    },

    // Orders (requires auth)
    getOrders: async (token: string) => {
        const res = await fetch(`${API_BASE}/orders`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch orders');
        return res.json();
    },

    getOrder: async (token: string, orderId: string) => {
        const res = await fetch(`${API_BASE}/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch order');
        return res.json();
    },

    // Profile
    getProfile: async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/profile`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch profile');
        return res.json();
    },

    // ========== ADMIN ENDPOINTS ==========

    // Admin Products
    getAdminProducts: async (params?: {
        page?: number;
        limit?: number;
        search?: string;
        categoryId?: string;
        includeDisabled?: boolean;
    }) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');

        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set('page', params.page.toString());
        if (params?.limit) queryParams.set('limit', params.limit.toString());
        if (params?.search) queryParams.set('search', params.search);
        if (params?.categoryId) queryParams.set('categoryId', params.categoryId);
        if (params?.includeDisabled) queryParams.set('includeDisabled', 'true');

        const url = `${API_BASE}/admin/products${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch admin products');
        return res.json();
    },

    getAdminProduct: async (id: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/admin/products/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch product');
        return res.json();
    },

    createAdminProduct: async (data: any) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/admin/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.text();
            throw new Error(error || 'Failed to create product');
        }
        return res.json();
    },

    updateAdminProduct: async (id: string, data: any) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/admin/products/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.text();
            throw new Error(error || 'Failed to update product');
        }
        return res.json();
    },

    deleteAdminProduct: async (id: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/admin/products/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to delete product');
        return res.json();
    },

    // Admin Variants
    getAdminVariants: async (productId: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/admin/products/${productId}/variants`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch variants');
        return res.json();
    },

    createAdminVariant: async (productId: string, data: any) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/admin/products/${productId}/variants`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create variant');
        return res.json();
    },

    updateAdminVariant: async (productId: string, variantId: string, data: any) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/admin/products/${productId}/variants/${variantId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update variant');
        return res.json();
    },

    deleteAdminVariant: async (productId: string, variantId: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/admin/products/${productId}/variants/${variantId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to delete variant');
        return res.json();
    },

    // Admin Orders
    getAdminOrders: async (params?: {
        page?: number;
        limit?: number;
        status?: string;
        paymentStatus?: string;
        search?: string;
    }) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');

        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set('page', params.page.toString());
        if (params?.limit) queryParams.set('limit', params.limit.toString());
        if (params?.status) queryParams.set('status', params.status);
        if (params?.paymentStatus) queryParams.set('paymentStatus', params.paymentStatus);
        if (params?.search) queryParams.set('search', params.search);

        const url = `${API_BASE}/admin/orders${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch admin orders');
        return res.json();
    },

    getAdminOrder: async (id: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/admin/orders/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch order');
        return res.json();
    },

    updateAdminOrderStatus: async (id: string, data: {
        status: string;
        paymentStatus?: string;
        reason?: string;
        updatedBy?: string;
    }) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/admin/orders/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update order status');
        return res.json();
    },

    getAdminOrderStats: async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/admin/orders/stats/overview`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch order stats');
        return res.json();
    },

    // Payments (Phase 3B)
    createPaymentIntent: async (data: { orderId: string }) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/payments/create-intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to create payment intent');
        }
        return res.json();
    },

    confirmCODOrder: async (data: { orderId: string }) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('Please log in to complete your order');
        const res = await fetch(`${API_BASE}/payments/cod-confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to confirm COD order');
        return res.json();
    },

    getOrderPayments: async (orderId: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/payments/order/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch order payments');
        return res.json();
    },

    // Orders
    createOrder: async (data: any) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('Please log in to place an order');
        const res = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to create order');
        }
        return res.json();
    },

    getRecentOrders: async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/orders/recent`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch recent orders');
        return res.json();
    },

    reorderFromPrevious: async (orderId: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/orders/reorder/${orderId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to reorder');
        }
        return res.json();
    },

    // Refill
    getUserRefills: async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/refill`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch refill profiles');
        return res.json();
    },

    createRefillProfile: async (data: { productId: string; variantId?: string; quantity: number }) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/refill/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create refill profile');
        return res.json();
    },

    createRefillOrder: async (data: { refillProfileId: string; paymentMethod: 'COD' | 'PREPAID'; deliveryNotes?: string }) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/refill/order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to create refill order');
        }
        return res.json();
    },

    deleteRefillProfile: async (profileId: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/refill/${profileId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to delete refill profile');
        return res.json();
    },

    // Addresses
    getUserAddresses: async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/addresses`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch addresses');
        return res.json();
    },

    createAddress: async (data: { label: string; street: string; city: string; state: string; zip: string; isDefault?: boolean }) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/addresses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create address');
        return res.json();
    },

    setDefaultAddress: async (addressId: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/addresses/${addressId}/set-default`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to set default address');
        return res.json();
    },

    deleteAddress: async (addressId: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('No auth token');
        const res = await fetch(`${API_BASE}/addresses/${addressId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to delete address');
        return res.json();
    },

    // Generic HTTP methods for flexibility
    get: async (path: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: HeadersInit = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}${path}`, {
            method: 'GET',
            headers,
            cache: 'no-store',
        });
        if (!res.ok) throw new Error(`GET ${path} failed`);
        return res.json();
    },

    post: async (path: string, data?: any) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers,
            body: data ? JSON.stringify(data) : undefined,
        });
        if (!res.ok) throw new Error(`POST ${path} failed`);
        return res.json();
    },

    put: async (path: string, data?: any) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}${path}`, {
            method: 'PUT',
            headers,
            body: data ? JSON.stringify(data) : undefined,
        });
        if (!res.ok) throw new Error(`PUT ${path} failed`);
        return res.json();
    },

    delete: async (path: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: HeadersInit = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}${path}`, {
            method: 'DELETE',
            headers,
        });
        if (!res.ok) throw new Error(`DELETE ${path} failed`);
        return res.json();
    },
};
