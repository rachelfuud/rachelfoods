/**
 * Products API Endpoints
 * 
 * All product-related API calls (public and admin)
 */

import apiClient from '../client';

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl?: string;
    categoryId: string;
    category?: {
        id: string;
        name: string;
    };
    featured: boolean;
    status: 'DRAFT' | 'PUBLISHED';
    variants?: ProductVariant[];
    createdAt: string;
    updatedAt: string;
}

export interface ProductVariant {
    id: string;
    productId: string;
    size?: string;
    weight?: string;
    price: number;
    stock: number;
}

export interface CreateProductData {
    name: string;
    description: string;
    price: number;
    categoryId: string;
    imageUrl?: string;
    featured?: boolean;
    status?: 'DRAFT' | 'PUBLISHED';
}

export interface UpdateProductData extends Partial<CreateProductData> {
    id: string;
}

export interface GetProductsParams {
    page?: number;
    limit?: number;
    categoryId?: string;
    search?: string;
    featured?: boolean;
    status?: 'DRAFT' | 'PUBLISHED';
    includeDisabled?: boolean;
}

export interface ProductsResponse {
    data: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const productsEndpoints = {
    /**
     * PUBLIC: Get all products (published only)
     */
    getProducts: async (params?: GetProductsParams): Promise<ProductsResponse> => {
        const { data } = await apiClient.get<ProductsResponse>('/products', { params });
        return data;
    },

    /**
     * PUBLIC: Get single product by ID
     */
    getProduct: async (id: string): Promise<Product> => {
        const { data } = await apiClient.get<Product>(`/products/${id}`);
        return data;
    },

    /**
     * PUBLIC: Get featured products
     */
    getFeaturedProducts: async (): Promise<Product[]> => {
        const { data } = await apiClient.get<Product[]>('/products/featured');
        return data;
    },

    /**
     * ADMIN: Get all products (including drafts)
     */
    getAdminProducts: async (params?: GetProductsParams): Promise<ProductsResponse> => {
        const { data } = await apiClient.get<ProductsResponse>('/admin/products', { params });
        return data;
    },

    /**
     * ADMIN: Create new product
     */
    createProduct: async (productData: CreateProductData): Promise<Product> => {
        const { data } = await apiClient.post<Product>('/admin/products', productData);
        return data;
    },

    /**
     * ADMIN: Update product
     */
    updateProduct: async ({ id, ...productData }: UpdateProductData): Promise<Product> => {
        const { data } = await apiClient.patch<Product>(`/admin/products/${id}`, productData);
        return data;
    },

    /**
     * ADMIN: Delete product
     */
    deleteProduct: async (id: string): Promise<void> => {
        await apiClient.delete(`/admin/products/${id}`);
    },

    /**
     * ADMIN: Toggle product featured status
     */
    toggleFeatured: async (id: string): Promise<Product> => {
        const { data } = await apiClient.patch<Product>(`/admin/products/${id}/toggle-featured`);
        return data;
    },
};
