const API_BASE = process.env.NODE_ENV === 'production'
    ? 'https://rachelfood-backend.onrender.com/api'
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api');

// Debug: log the API URL being used
if (typeof window !== 'undefined') {
    console.log('API_BASE:', API_BASE);
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
        const res = await fetch(`${API_BASE}/categories`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch categories');
        return res.json();
    },

    // Products
    getProducts: async (categorySlug?: string) => {
        const url = categorySlug
            ? `${API_BASE}/categories/${categorySlug}/products`
            : `${API_BASE}/products`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch products');
        return res.json();
    },

    getProduct: async (slug: string) => {
        const res = await fetch(`${API_BASE}/products/slug/${slug}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch product');
        return res.json();
    },

    getFeaturedProducts: async () => {
        const res = await fetch(`${API_BASE}/products/featured`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch featured products');
        return res.json();
    },

    getPopularProducts: async (limit = 6) => {
        const res = await fetch(`${API_BASE}/products/popular?limit=${limit}`, { cache: 'no-store' });
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

    createOrder: async (token: string, data: any) => {
        const res = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create order');
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
};
