'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function CMSPagesPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);

    const pages = [
        { title: 'About Us', slug: 'about-us', status: 'Published', lastModified: '2026-02-04' },
        { title: 'Contact', slug: 'contact', status: 'Published', lastModified: '2026-02-03' },
        { title: 'FAQ', slug: 'faq', status: 'Draft', lastModified: '2026-02-02' },
        { title: 'Terms & Conditions', slug: 'terms', status: 'Published', lastModified: '2026-01-15' },
        { title: 'Privacy Policy', slug: 'privacy', status: 'Published', lastModified: '2026-01-15' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Content Pages</h1>
                    <p className="text-foreground/60 mt-1">Manage static pages and content</p>
                </div>
                <button
                    onClick={() => showToast('Create page feature coming soon!', 'info')}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    + New Page
                </button>
            </div>

            {/* Pages List */}
            <div className="bg-background border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted border-b border-border">
                        <tr>
                            <th className="text-left px-6 py-4 font-semibold">Page Title</th>
                            <th className="text-left px-6 py-4 font-semibold">Slug</th>
                            <th className="text-left px-6 py-4 font-semibold">Status</th>
                            <th className="text-left px-6 py-4 font-semibold">Last Modified</th>
                            <th className="text-right px-6 py-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pages.map((page) => (
                            <tr key={page.slug} className="border-b border-border hover:bg-muted/50">
                                <td className="px-6 py-4 font-medium">{page.title}</td>
                                <td className="px-6 py-4 text-sm text-foreground/70">/{page.slug}</td>
                                <td className="px-6 py-4">
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-semibold ${page.status === 'Published'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            }`}
                                    >
                                        {page.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground/70">{page.lastModified}</td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => showToast('Edit feature coming soon!', 'info')}
                                        className="text-primary hover:underline text-sm font-medium"
                                    >
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Coming Soon Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">ℹ️</span>
                    <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            Feature in Development
                        </h3>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            Full CMS page editor with rich text editing, media embedding, and SEO controls is currently in development.
                            For now, pages are managed through the codebase.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
