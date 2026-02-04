'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface CMSPage {
    id: string;
    title: string;
    slug: string;
    content: string;
    status: 'DRAFT' | 'PUBLISHED';
    lastModified: string;
}

export default function CMSPagesPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [pages, setPages] = useState<CMSPage[]>([]);

    useEffect(() => {
        loadPages();
    }, []);

    const loadPages = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                showToast('Please login first', 'error');
                router.push('/admin/login');
                return;
            }

            const API_BASE = process.env.NEXT_PUBLIC_API_URL
                ? `${process.env.NEXT_PUBLIC_API_URL}/api`
                : 'http://localhost:3001/api';

            const response = await fetch(`${API_BASE}/admin/cms/pages`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                // If endpoint doesn't exist yet, show sample data
                if (response.status === 404) {
                    setPages([
                        {
                            id: '1',
                            title: 'About Us',
                            slug: 'about-us',
                            content: 'Sample content',
                            status: 'PUBLISHED',
                            lastModified: new Date().toISOString()
                        },
                        {
                            id: '2',
                            title: 'Contact',
                            slug: 'contact',
                            content: 'Sample content',
                            status: 'PUBLISHED',
                            lastModified: new Date().toISOString()
                        },
                    ]);
                    showToast('CMS Pages endpoint not implemented yet - showing sample data', 'info');
                    return;
                }
                throw new Error(`Failed to load: ${response.statusText}`);
            }

            const data = await response.json();
            setPages(data.pages || data.data || []);
        } catch (error: any) {
            console.error('Failed to load CMS pages:', error);
            showToast(error.message || 'Failed to load pages', 'error');
            // Show sample data as fallback
            setPages([
                {
                    id: '1',
                    title: 'About Us',
                    slug: 'about-us',
                    content: 'Sample content',
                    status: 'PUBLISHED',
                    lastModified: new Date().toISOString()
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Delete "${title}"?`)) return;

        try {
            const token = localStorage.getItem('token');
            const API_BASE = process.env.NEXT_PUBLIC_API_URL
                ? `${process.env.NEXT_PUBLIC_API_URL}/api`
                : 'http://localhost:3001/api';

            const response = await fetch(`${API_BASE}/admin/cms/pages/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) throw new Error('Delete failed');

            showToast('Page deleted successfully', 'success');
            loadPages();
        } catch (error: any) {
            showToast(error.message || 'Failed to delete page', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
            </div>
        );
    }

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
                        {pages.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-12 text-foreground/60">
                                    No pages found. Create your first page to get started.
                                </td>
                            </tr>
                        ) : (
                            pages.map((page) => (
                                <tr key={page.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-6 py-4 font-medium">{page.title}</td>
                                    <td className="px-6 py-4 text-foreground/70">/{page.slug}</td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${page.status === 'PUBLISHED'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                                }`}
                                        >
                                            {page.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-foreground/70">
                                        {new Date(page.lastModified).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button
                                            onClick={() => showToast('Edit feature coming soon', 'info')}
                                            className="text-primary hover:underline text-sm"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(page.id, page.title)}
                                            className="text-red-600 hover:underline text-sm"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
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
                    </tbody >
                </table >
            </div >

    {/* Coming Soon Notice */ }
    < div className = "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6" >
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
            </div >
        </div >
    );
}
