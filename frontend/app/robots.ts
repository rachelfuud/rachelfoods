/**
 * robots.txt Generation
 * Next.js 16 App Router - Controls search engine crawling
 * FREE SEO optimization - prevents indexing of admin/API routes
 */

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rachelfoods.com';

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/admin/*',      // Don't index admin dashboard
                    '/api/*',        // Don't index API routes
                    '/cart',         // Don't index cart page (user-specific)
                    '/checkout',     // Don't index checkout (user-specific)
                    '/orders/*',     // Don't index order pages (user-specific)
                    '/profile',      // Don't index profile page (user-specific)
                    '/login',        // Don't index login page
                    '/register',     // Don't index registration page
                ],
            },
            {
                userAgent: 'GPTBot',  // OpenAI crawler
                disallow: '/',        // Don't allow AI training on our content
            },
            {
                userAgent: 'ChatGPT-User',
                disallow: '/',
            },
        ],
        sitemap: `${BASE_URL}/sitemap.xml`,
    };
}
