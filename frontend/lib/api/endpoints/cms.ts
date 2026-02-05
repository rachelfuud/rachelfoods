/**
 * CMS API Endpoints
 * 
 * All content management system API calls
 */

import apiClient from '../client';

export interface CMSPage {
    id: string;
    title: string;
    slug: string;
    content: string;
    published: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CMSMedia {
    id: string;
    url: string;
    filename: string;
    mimeType: string;
    size: number;
    alt?: string;
    createdAt: string;
}

export interface CMSConfig {
    id: string;
    key: string;
    value: any;
    updatedAt: string;
}

export interface HeroSlide {
    id: string;
    title: string;
    subtitle?: string;
    imageUrl: string;
    ctaText?: string;
    ctaLink?: string;
    order: number;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export const cmsEndpoints = {
    /**
     * Get all CMS pages
     */
    getPages: async (): Promise<CMSPage[]> => {
        const { data } = await apiClient.get<CMSPage[]>('/admin/cms/pages');
        return data;
    },

    /**
     * Get single CMS page
     */
    getPage: async (id: string): Promise<CMSPage> => {
        const { data } = await apiClient.get<CMSPage>(`/admin/cms/pages/${id}`);
        return data;
    },

    /**
     * Create CMS page
     */
    createPage: async (pageData: Omit<CMSPage, 'id' | 'createdAt' | 'updatedAt'>): Promise<CMSPage> => {
        const { data } = await apiClient.post<CMSPage>('/admin/cms/pages', pageData);
        return data;
    },

    /**
     * Update CMS page
     */
    updatePage: async (id: string, pageData: Partial<CMSPage>): Promise<CMSPage> => {
        const { data } = await apiClient.patch<CMSPage>(`/admin/cms/pages/${id}`, pageData);
        return data;
    },

    /**
     * Delete CMS page
     */
    deletePage: async (id: string): Promise<void> => {
        await apiClient.delete(`/admin/cms/pages/${id}`);
    },

    /**
     * Get all media files
     */
    getMedia: async (): Promise<CMSMedia[]> => {
        const { data } = await apiClient.get<CMSMedia[]>('/admin/cms/media');
        return data;
    },

    /**
     * Upload media file
     */
    uploadMedia: async (file: File): Promise<CMSMedia> => {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await apiClient.post<CMSMedia>('/admin/cms/media', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return data;
    },

    /**
     * Delete media file
     */
    deleteMedia: async (id: string): Promise<void> => {
        await apiClient.delete(`/admin/cms/media/${id}`);
    },

    /**
     * Get CMS config by key
     */
    getConfig: async (key: string): Promise<CMSConfig> => {
        const { data } = await apiClient.get<CMSConfig>(`/admin/cms/config/${key}`);
        return data;
    },

    /**
     * Update CMS config
     */
    updateConfig: async (key: string, value: any): Promise<CMSConfig> => {
        const { data } = await apiClient.patch<CMSConfig>(`/admin/cms/config/${key}`, { value });
        return data;
    },

    /**
     * Get hero slides
     */
    getHeroSlides: async (): Promise<HeroSlide[]> => {
        const { data } = await apiClient.get<HeroSlide[]>('/admin/cms/hero-slides');
        return data;
    },

    /**
     * Create hero slide
     */
    createHeroSlide: async (slideData: Omit<HeroSlide, 'id' | 'createdAt' | 'updatedAt'>): Promise<HeroSlide> => {
        const { data } = await apiClient.post<HeroSlide>('/admin/cms/hero-slides', slideData);
        return data;
    },

    /**
     * Update hero slide
     */
    updateHeroSlide: async (id: string, slideData: Partial<HeroSlide>): Promise<HeroSlide> => {
        const { data } = await apiClient.patch<HeroSlide>(`/admin/cms/hero-slides/${id}`, slideData);
        return data;
    },

    /**
     * Delete hero slide
     */
    deleteHeroSlide: async (id: string): Promise<void> => {
        await apiClient.delete(`/admin/cms/hero-slides/${id}`);
    },
};
