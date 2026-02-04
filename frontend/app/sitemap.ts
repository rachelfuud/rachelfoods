/**
 * Dynamic Sitemap Generation
 * Next.js 16 App Router - Automatic XML sitemap for SEO
 * FREE optimization - helps Google index all pages faster
 */

import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rachelfoods.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Static pages with high priority
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${BASE_URL}/catalog`,
            lastModified: new Date(),
            changeFrequency: 'hourly',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/about`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/help`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${BASE_URL}/contact`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${BASE_URL}/kitchen-refill`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
    ];

    // Fetch dynamic product pages
    let productPages: MetadataRoute.Sitemap = [];
    try {
        const response = await fetch(`${API_URL}/api/products`, {
            next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (response.ok) {
            const products = await response.json();

            productPages = products
                .filter((product: any) => product.status === 'ACTIVE') // Only index active products
                .map((product: any) => ({
                    url: `${BASE_URL}/products/${product.slug}`,
                    lastModified: new Date(product.updatedAt || product.createdAt),
                    changeFrequency: 'weekly' as const,
                    priority: 0.8,
                }));
        }
    } catch (error) {
        console.error('Failed to fetch products for sitemap:', error);
    }

    // Fetch dynamic category pages
    let categoryPages: MetadataRoute.Sitemap = [];
    try {
        const response = await fetch(`${API_URL}/api/categories`, {
            next: { revalidate: 3600 },
        });

        if (response.ok) {
            const categories = await response.json();

            categoryPages = categories.map((category: any) => ({
                url: `${BASE_URL}/catalog?category=${category.slug}`,
                lastModified: new Date(),
                changeFrequency: 'daily' as const,
                priority: 0.7,
            }));
        }
    } catch (error) {
        console.error('Failed to fetch categories for sitemap:', error);
    }

    return [...staticPages, ...productPages, ...categoryPages];
}
