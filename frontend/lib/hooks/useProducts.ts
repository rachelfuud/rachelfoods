/**
 * React Query Hooks for Products
 * 
 * Automatic caching, refetching, and loading states
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { productsEndpoints, Product, GetProductsParams, CreateProductData, UpdateProductData } from '../api/endpoints/products';

/**
 * Get all products (public)
 */
export function useProducts(params?: GetProductsParams, options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['products', params],
        queryFn: () => productsEndpoints.getProducts(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
        ...options,
    });
}

/**
 * Get single product by ID
 */
export function useProduct(id: string, options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['products', id],
        queryFn: () => productsEndpoints.getProduct(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
        ...options,
    });
}

/**
 * Get featured products
 */
export function useFeaturedProducts(options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['products', 'featured'],
        queryFn: () => productsEndpoints.getFeaturedProducts(),
        staleTime: 5 * 60 * 1000,
        ...options,
    });
}

/**
 * ADMIN: Get all products (including drafts)
 */
export function useAdminProducts(params?: GetProductsParams, options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['admin', 'products', params],
        queryFn: () => productsEndpoints.getAdminProducts(params),
        staleTime: 1 * 60 * 1000, // 1 minute for admin data
        ...options,
    });
}

/**
 * ADMIN: Create product mutation
 */
export function useCreateProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (productData: CreateProductData) => productsEndpoints.createProduct(productData),
        onSuccess: () => {
            // Invalidate products queries to refetch
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

/**
 * ADMIN: Update product mutation
 */
export function useUpdateProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (productData: UpdateProductData) => productsEndpoints.updateProduct(productData),
        onSuccess: (data) => {
            // Invalidate and update specific product
            queryClient.invalidateQueries({ queryKey: ['products', data.id] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

/**
 * ADMIN: Delete product mutation
 */
export function useDeleteProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => productsEndpoints.deleteProduct(id),
        onSuccess: () => {
            // Invalidate products list
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

/**
 * ADMIN: Toggle product featured status
 */
export function useToggleFeatured() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => productsEndpoints.toggleFeatured(id),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['products', data.id] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
            queryClient.invalidateQueries({ queryKey: ['products', 'featured'] });
        },
    });
}
