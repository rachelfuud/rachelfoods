'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import FileUpload, { UploadedFile } from '@/components/ui/FileUpload';
import { centsToDollars, dollarsToCents } from '@/lib/utils/currency';
import { api } from '@/lib/api-client';
import { uploadFile } from '@/lib/upload';

interface Category {
    id: string;
    name: string;
    slug: string;
}

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: 0,
        categoryId: '',
        unit: 'unit',
        weight: 0,
        stock: 0,
        status: 'ACTIVE',
        isFeatured: false,
        supportsRefill: true,
    });

    useEffect(() => {
        if (productId) {
            fetchCategories();
            fetchProduct();
        }
    }, [productId]);

    const fetchCategories = async () => {
        try {
            const data = await api.get<Category[]>('/api/categories');
            setCategories(data);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const fetchProduct = async () => {
        try {
            const data = await api.get(`/api/products/${productId}`);

            setFormData({
                name: data.name || '',
                description: data.description || '',
                price: centsToDollars(data.price || 0), // Convert from cents to dollars
                categoryId: data.categoryId || '',
                unit: data.unit || 'Pack',
                weight: data.weight || 500,
                stock: data.stock || 0,
                status: data.status || 'ACTIVE',
                isFeatured: data.isFeatured || false,
                supportsRefill: data.supportsRefill !== false,
            });

            // Load existing media
            const existingFiles: UploadedFile[] = [];

            // Load images
            if (data.productImages && data.productImages.length > 0) {
                data.productImages.forEach((img: any) => {
                    existingFiles.push({
                        id: img.id,
                        url: img.url,
                        type: 'image',
                        altText: img.altText,
                        isPrimary: img.isPrimary,
                        displayOrder: img.displayOrder,
                    });
                });
            } else if (data.imageUrl) {
                // Fallback to old single image field
                existingFiles.push({
                    id: 'legacy-image',
                    url: data.imageUrl,
                    type: 'image',
                    isPrimary: true,
                    displayOrder: 0,
                });
            }

            // Load videos
            if (data.productVideos && data.productVideos.length > 0) {
                data.productVideos.forEach((vid: any) => {
                    existingFiles.push({
                        id: vid.id,
                        url: vid.url,
                        type: 'video',
                        title: vid.title,
                        description: vid.description,
                        thumbnail: vid.thumbnail,
                        duration: vid.duration,
                        displayOrder: vid.displayOrder,
                    });
                });
            }

            setUploadedFiles(existingFiles);
        } catch (error) {
            console.error('Failed to fetch product:', error);
            alert('Failed to load product');
            router.push('/admin/products');
        } finally {
            setLoading(false);
        }
    };

    const uploadFilesToServer = async (files: UploadedFile[]) => {
        // This would upload files to your file storage service
        const uploadedUrls = await Promise.all(
            files.map(async (file) => {
                if (file.file) {
                    try {
                        const url = await uploadFile(file.file, 'rachelfoods/products');
                        return { ...file, url };
                    } catch (error) {
                        console.error('Failed to upload file:', file.file.name, error);
                        // Return with preview URL as fallback
                        return { ...file, url: file.preview || file.url };
                    }
                }
                return file;
            })
        );
        return uploadedUrls;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.description || formData.price <= 0) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            setSaving(true);

            // Upload new files
            const filesWithUrls = await uploadFilesToServer(uploadedFiles);

            // Separate images and videos
            const images = filesWithUrls
                .filter((f) => f.type === 'image')
                .map((f, idx) => ({
                    url: f.url,
                    altText: f.altText || formData.name,
                    displayOrder: f.displayOrder ?? idx,
                    isPrimary: f.isPrimary ?? idx === 0,
                }));

            const videos = filesWithUrls
                .filter((f) => f.type === 'video')
                .map((f, idx) => ({
                    url: f.url,
                    title: f.title || formData.name,
                    description: f.description,
                    thumbnail: f.thumbnail,
                    duration: f.duration,
                    displayOrder: f.displayOrder ?? idx,
                }));

            // Convert price from dollars to cents for backend
            const priceInCents = dollarsToCents(formData.price);

            await api.put(`/api/products/${productId}`, {
                ...formData,
                price: priceInCents,
                images,
                videos,
            });

            alert('Product updated successfully!');
            router.push('/admin/products');
        } catch (error: any) {
            console.error('Failed to update product:', error);
            alert(error.message || 'Failed to update product');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-text-primary">Edit Product</h1>
                <p className="text-text-secondary mt-2">Update product information and media</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="bg-surface border border-border rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">
                        Basic Information
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Product Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Description *
                            </label>
                            <textarea
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={4}
                                className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Price (₦) *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Stock *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Unit
                                </label>
                                <input
                                    type="text"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Weight (kg)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.weight}
                                    onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Category ID
                            </label>
                            <input
                                type="text"
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Media Upload */}
                <div className="bg-surface border border-border rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">
                        Product Media
                    </h2>
                    <p className="text-sm text-text-secondary mb-4">
                        Upload or manage product images and videos. Set a primary image for display.
                    </p>

                    <FileUpload
                        files={uploadedFiles}
                        onChange={setUploadedFiles}
                        maxFiles={15}
                        acceptImages={true}
                        acceptVideos={true}
                        maxSizeInMB={50}
                    />
                </div>

                {/* Options */}
                <div className="bg-surface border border-border rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">
                        Product Options
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="featured"
                                checked={formData.isFeatured}
                                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                            />
                            <label htmlFor="featured" className="text-sm font-medium text-text-primary">
                                Feature this product on homepage
                            </label>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="refill"
                                checked={formData.supportsRefill}
                                onChange={(e) => setFormData({ ...formData, supportsRefill: e.target.checked })}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                            />
                            <label htmlFor="refill" className="text-sm font-medium text-text-primary">
                                Enable one-click refill for this product
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Status
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="status"
                                        value="DRAFT"
                                        checked={formData.status === 'DRAFT'}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-4 h-4 border-border text-primary focus:ring-2 focus:ring-primary"
                                    />
                                    <span className="text-sm text-text-primary">Draft</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="status"
                                        value="ACTIVE"
                                        checked={formData.status === 'ACTIVE'}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-4 h-4 border-border text-primary focus:ring-2 focus:ring-primary"
                                    />
                                    <span className="text-sm text-text-primary">Active</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pb-6">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {saving ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/admin/products')}
                        disabled={saving}
                        className="px-6 py-3 border border-border rounded-md hover:bg-muted text-text-primary font-medium disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
