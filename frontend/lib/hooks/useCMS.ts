/**
 * React Query Hooks for CMS
 * 
 * Content management system hooks with caching
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { cmsEndpoints, CMSPage, CMSMedia, HeroSlide } from '../api/endpoints/cms';

/**
 * Get all CMS pages
 */
export function useCMSPages(options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['cms', 'pages'],
        queryFn: () => cmsEndpoints.getPages(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false, // Don't retry if endpoint doesn't exist
        ...options,
    });
}

/**
 * Get single CMS page
 */
export function useCMSPage(id: string, options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['cms', 'pages', id],
        queryFn: () => cmsEndpoints.getPage(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
        ...options,
    });
}

/**
 * Create CMS page
 */
export function useCreateCMSPage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (pageData: Omit<CMSPage, 'id' | 'createdAt' | 'updatedAt'>) =>
            cmsEndpoints.createPage(pageData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cms', 'pages'] });
        },
    });
}

/**
 * Update CMS page
 */
export function useUpdateCMSPage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, ...data }: { id: string } & Partial<CMSPage>) =>
            cmsEndpoints.updatePage(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['cms', 'pages', data.id] });
            queryClient.invalidateQueries({ queryKey: ['cms', 'pages'] });
        },
    });
}

/**
 * Delete CMS page
 */
export function useDeleteCMSPage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => cmsEndpoints.deletePage(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cms', 'pages'] });
        },
    });
}

/**
 * Get all media files
 */
export function useCMSMedia(options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['cms', 'media'],
        queryFn: () => cmsEndpoints.getMedia(),
        staleTime: 5 * 60 * 1000,
        retry: false,
        ...options,
    });
}

/**
 * Upload media file
 */
export function useUploadMedia() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => cmsEndpoints.uploadMedia(file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cms', 'media'] });
        },
    });
}

/**
 * Delete media file
 */
export function useDeleteMedia() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => cmsEndpoints.deleteMedia(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cms', 'media'] });
        },
    });
}

/**
 * Get CMS config
 */
export function useCMSConfig(key: string, options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['cms', 'config', key],
        queryFn: () => cmsEndpoints.getConfig(key),
        enabled: !!key,
        staleTime: 10 * 60 * 1000, // 10 minutes for config
        retry: false,
        ...options,
    });
}

/**
 * Update CMS config
 */
export function useUpdateCMSConfig() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ key, value }: { key: string; value: any }) =>
            cmsEndpoints.updateConfig(key, value),
        onSuccess: (_, { key }) => {
            queryClient.invalidateQueries({ queryKey: ['cms', 'config', key] });
        },
    });
}

/**
 * Get hero slides
 */
export function useHeroSlides(options?: UseQueryOptions) {
    return useQuery({
        queryKey: ['cms', 'hero-slides'],
        queryFn: () => cmsEndpoints.getHeroSlides(),
        staleTime: 5 * 60 * 1000,
        retry: false,
        ...options,
    });
}

/**
 * Create hero slide
 */
export function useCreateHeroSlide() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (slideData: Omit<HeroSlide, 'id' | 'createdAt' | 'updatedAt'>) =>
            cmsEndpoints.createHeroSlide(slideData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cms', 'hero-slides'] });
        },
    });
}

/**
 * Update hero slide
 */
export function useUpdateHeroSlide() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, ...data }: { id: string } & Partial<HeroSlide>) =>
            cmsEndpoints.updateHeroSlide(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cms', 'hero-slides'] });
        },
    });
}

/**
 * Delete hero slide
 */
export function useDeleteHeroSlide() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => cmsEndpoints.deleteHeroSlide(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cms', 'hero-slides'] });
        },
    });
}
