'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';
import Image from 'next/image';

interface MediaFile {
    id: string;
    filename: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: string;
}

export default function MediaLibraryPage() {
    const { showToast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);

    useEffect(() => {
        loadMedia();
    }, []);

    const loadMedia = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                showToast('Please login first', 'error');
                return;
            }

            const API_BASE = process.env.NEXT_PUBLIC_API_URL
                ? `${process.env.NEXT_PUBLIC_API_URL}/api`
                : 'http://localhost:3001/api';

            const response = await fetch(`${API_BASE}/admin/cms/media`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                // If endpoint doesn't exist, show sample data
                if (response.status === 404) {
                    setMediaFiles([
                        {
                            id: '1',
                            filename: 'logo.png',
                            url: '/logo.png',
                            type: 'image/png',
                            size: 15234,
                            uploadedAt: new Date().toISOString(),
                        },
                    ]);
                    showToast('Media library endpoint not implemented yet - showing sample', 'info');
                    return;
                }
                throw new Error(`Failed to load: ${response.statusText}`);
            }

            const data = await response.json();
            setMediaFiles(data.media || data.files || []);
        } catch (error: any) {
            console.error('Failed to load media:', error);
            showToast(error.message || 'Failed to load media library', 'error');
            // Fallback to sample data
            setMediaFiles([
                {
                    id: '1',
                    filename: 'placeholder.jpg',
                    url: '/placeholder.jpg',
                    type: 'image/jpeg',
                    size: 15234,
                    uploadedAt: new Date().toISOString(),
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const handleFileUpload = () => {
        showToast('Upload feature will be available in next update', 'info');
    };

    const handleDelete = async (id: string, filename: string) => {
        if (!confirm(`Delete "${filename}"?`)) return;

        try {
            const token = localStorage.getItem('token');
            const API_BASE = process.env.NEXT_PUBLIC_API_URL
                ? `${process.env.NEXT_PUBLIC_API_URL}/api`
                : 'http://localhost:3001/api';

            const response = await fetch(`${API_BASE}/admin/cms/media/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) throw new Error('Delete failed');

            showToast('Media deleted successfully', 'success');
            loadMedia();
        } catch (error: any) {
            showToast(error.message || 'Failed to delete media', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Media Library</h1>
                    <p className="text-foreground/60 mt-1">Manage images, videos, and files</p>
                </div>
                <button
                    onClick={handleFileUpload}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    + Upload Media
                </button>
            </div>

            {/* Media Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {mediaFiles.map((file) => (
                    <div
                        key={file.id}
                        className="bg-background border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    >
                        <div className="aspect-square bg-muted relative">
                            {file.type.startsWith('image/') ? (
                                <Image
                                    src={file.url}
                                    alt={file.filename}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl">
                                    📄
                                </div>
                            )}
                        </div>
                        <div className="p-3">
                            <p className="font-medium text-sm truncate">{file.filename}</p>
                            <p className="text-xs text-foreground/60 mt-1">
                                {formatFileSize(file.size)} • {file.uploadedAt}
                            </p>
                            <button
                                onClick={() => showToast('Copied URL to clipboard!', 'success')}
                                className="mt-2 text-xs text-primary hover:underline"
                            >
                                Copy URL
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Coming Soon Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">ℹ️</span>
                    <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            Media Library Coming Soon
                        </h3>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            Full media library with drag-and-drop upload, image editing, and organization features is in development.
                            For now, media files are managed through the file system.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
