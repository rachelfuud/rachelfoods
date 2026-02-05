'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCMSPages, useDeleteCMSPage } from '@/lib/hooks/useCMS';
import { useToast } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function CMSPagesPage() {
    const router = useRouter();
    const { showToast } = useToast();

    // React Query hook with automatic caching
    const { data: pages = [], isLoading, error } = useCMSPages({
        retry: false, // Don't retry if endpoint doesn't exist
    });

    const deleteMutation = useDeleteCMSPage();

    // Sample fallback data if backend endpoint doesn't exist
    const samplePages = [
        { id: '1', title: 'About Us', slug: 'about-us', content: '', published: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: '2', title: 'Contact', slug: 'contact', content: '', published: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];

    const displayPages = error || pages.length === 0 ? samplePages : pages;

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Delete "${title}"?`)) return;

        try {
            await deleteMutation.mutateAsync(id);
            showToast('Page deleted successfully', 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to delete page', 'error');
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-[400px]"><LoadingSpinner /></div>;
    }

    return (
        <div className="space-y-6">
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
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${page.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}
                                        >
                                            {page.published ? 'PUBLISHED' : 'DRAFT'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-foreground/70">
                                        {new Date(page.updatedAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={() => showToast('Edit feature coming soon', 'info')} className="text-primary hover:underline text-sm">
                                            Edit
                                        </button>
                                        <button onClick={() => handleDelete(page.id, page.title)} className="text-red-600 hover:underline text-sm">
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
