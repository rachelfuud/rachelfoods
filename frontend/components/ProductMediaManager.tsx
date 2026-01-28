'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Image from 'next/image';

interface ProductImage {
    id: string;
    url: string;
    altText: string | null;
    displayOrder: number;
    isPrimary: boolean;
}

interface ProductVideo {
    id: string;
    url: string;
    title: string | null;
    description: string | null;
    thumbnail: string | null;
    duration: number | null;
    displayOrder: number;
}

interface ProductMediaManagerProps {
    productId: string;
    readonly?: boolean;
}

export function ProductMediaManager({ productId, readonly = false }: ProductMediaManagerProps) {
    const [images, setImages] = useState<ProductImage[]>([]);
    const [videos, setVideos] = useState<ProductVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'images' | 'videos'>('images');

    // Image form state
    const [imageForm, setImageForm] = useState({
        url: '',
        altText: '',
        isPrimary: false,
    });

    // Video form state
    const [videoForm, setVideoForm] = useState({
        url: '',
        title: '',
        description: '',
        thumbnail: '',
        duration: 0,
    });

    useEffect(() => {
        loadMedia();
    }, [productId]);

    const loadMedia = async () => {
        setLoading(true);
        try {
            const [imagesData, videosData] = await Promise.all([
                api.get(`/admin/products/${productId}/media/images`),
                api.get(`/admin/products/${productId}/media/videos`),
            ]);
            setImages(imagesData);
            setVideos(videosData);
        } catch (error) {
            console.error('Failed to load media:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddImage = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/admin/products/${productId}/media/images`, {
                images: [imageForm],
            });
            setImageForm({ url: '', altText: '', isPrimary: false });
            loadMedia();
        } catch (error) {
            console.error('Failed to add image:', error);
            alert('Failed to add image');
        }
    };

    const handleDeleteImage = async (imageId: string) => {
        if (!confirm('Delete this image?')) return;
        try {
            await api.delete(`/admin/products/${productId}/media/images/${imageId}`);
            loadMedia();
        } catch (error) {
            console.error('Failed to delete image:', error);
            alert('Failed to delete image');
        }
    };

    const handleSetPrimaryImage = async (imageId: string) => {
        try {
            await api.put(`/admin/products/${productId}/media/images/${imageId}`, {
                isPrimary: true,
            });
            loadMedia();
        } catch (error) {
            console.error('Failed to set primary image:', error);
            alert('Failed to set primary image');
        }
    };

    const handleAddVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/admin/products/${productId}/media/videos`, {
                videos: [videoForm],
            });
            setVideoForm({ url: '', title: '', description: '', thumbnail: '', duration: 0 });
            loadMedia();
        } catch (error) {
            console.error('Failed to add video:', error);
            alert('Failed to add video');
        }
    };

    const handleDeleteVideo = async (videoId: string) => {
        if (!confirm('Delete this video?')) return;
        try {
            await api.delete(`/admin/products/${productId}/media/videos/${videoId}`);
            loadMedia();
        } catch (error) {
            console.error('Failed to delete video:', error);
            alert('Failed to delete video');
        }
    };

    if (loading) {
        return <div className="p-4 text-center">Loading media...</div>;
    }

    return (
        <div className="border rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Product Media</h2>
                <div className="flex gap-2">
                    <button
                        className={`px-4 py-2 rounded ${activeTab === 'images' ? 'bg-primary text-white' : 'bg-gray-200'}`}
                        onClick={() => setActiveTab('images')}
                    >
                        Images ({images.length})
                    </button>
                    <button
                        className={`px-4 py-2 rounded ${activeTab === 'videos' ? 'bg-primary text-white' : 'bg-gray-200'}`}
                        onClick={() => setActiveTab('videos')}
                    >
                        Videos ({videos.length})
                    </button>
                </div>
            </div>

            {activeTab === 'images' && (
                <div>
                    {!readonly && (
                        <form onSubmit={handleAddImage} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded">
                            <h3 className="font-semibold mb-3">Add New Image</h3>
                            <div className="grid gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Image URL *</label>
                                    <input
                                        type="url"
                                        required
                                        value={imageForm.url}
                                        onChange={(e) => setImageForm({ ...imageForm, url: e.target.value })}
                                        className="w-full px-3 py-2 border rounded"
                                        placeholder="https://example.com/image.jpg or /images/product.jpg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Alt Text</label>
                                    <input
                                        type="text"
                                        value={imageForm.altText}
                                        onChange={(e) => setImageForm({ ...imageForm, altText: e.target.value })}
                                        className="w-full px-3 py-2 border rounded"
                                        placeholder="Description for accessibility"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={imageForm.isPrimary}
                                        onChange={(e) => setImageForm({ ...imageForm, isPrimary: e.target.checked })}
                                        className="w-4 h-4"
                                    />
                                    <label className="text-sm">Set as primary image (shown in product cards)</label>
                                </div>
                                <button
                                    type="submit"
                                    className="bg-primary text-white px-4 py-2 rounded hover:opacity-90"
                                >
                                    Add Image
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {images.map((image) => (
                            <div key={image.id} className="border rounded-lg p-4">
                                <div className="relative aspect-square mb-2 bg-gray-100 rounded overflow-hidden">
                                    <Image
                                        src={image.url}
                                        alt={image.altText || 'Product image'}
                                        fill
                                        className="object-cover"
                                    />
                                    {image.isPrimary && (
                                        <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">
                                            PRIMARY
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    {image.altText || 'No alt text'}
                                </p>
                                {!readonly && (
                                    <div className="flex gap-2">
                                        {!image.isPrimary && (
                                            <button
                                                onClick={() => handleSetPrimaryImage(image.id)}
                                                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                                            >
                                                Set Primary
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteImage(image.id)}
                                            className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {images.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No images added yet. Add your first image above.
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'videos' && (
                <div>
                    {!readonly && (
                        <form onSubmit={handleAddVideo} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded">
                            <h3 className="font-semibold mb-3">Add New Video</h3>
                            <div className="grid gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Video URL *</label>
                                    <input
                                        type="url"
                                        required
                                        value={videoForm.url}
                                        onChange={(e) => setVideoForm({ ...videoForm, url: e.target.value })}
                                        className="w-full px-3 py-2 border rounded"
                                        placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Title</label>
                                    <input
                                        type="text"
                                        value={videoForm.title}
                                        onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                                        className="w-full px-3 py-2 border rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Description</label>
                                    <textarea
                                        value={videoForm.description}
                                        onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                                        className="w-full px-3 py-2 border rounded"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Thumbnail URL</label>
                                    <input
                                        type="url"
                                        value={videoForm.thumbnail}
                                        onChange={(e) => setVideoForm({ ...videoForm, thumbnail: e.target.value })}
                                        className="w-full px-3 py-2 border rounded"
                                        placeholder="https://example.com/thumbnail.jpg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Duration (seconds)</label>
                                    <input
                                        type="number"
                                        value={videoForm.duration}
                                        onChange={(e) => setVideoForm({ ...videoForm, duration: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border rounded"
                                        min="0"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="bg-primary text-white px-4 py-2 rounded hover:opacity-90"
                                >
                                    Add Video
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {videos.map((video) => (
                            <div key={video.id} className="border rounded-lg p-4">
                                {video.thumbnail && (
                                    <div className="relative aspect-video mb-2 bg-gray-100 rounded overflow-hidden">
                                        <Image
                                            src={video.thumbnail}
                                            alt={video.title || 'Video thumbnail'}
                                            fill
                                            className="object-cover"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-16 h-16 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                                                <div className="w-0 h-0 border-l-8 border-l-white border-t-6 border-t-transparent border-b-6 border-b-transparent ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <h4 className="font-semibold">{video.title || 'Untitled Video'}</h4>
                                {video.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{video.description}</p>
                                )}
                                {video.duration && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Duration: {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                                    </p>
                                )}
                                <a
                                    href={video.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                                >
                                    View Video →
                                </a>
                                {!readonly && (
                                    <div className="mt-2">
                                        <button
                                            onClick={() => handleDeleteVideo(video.id)}
                                            className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {videos.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No videos added yet. Add your first video above.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
