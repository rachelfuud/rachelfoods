'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload, { UploadedFile } from '@/components/ui/FileUpload';

export default function NewProductPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: 0,
        categoryId: '',
        unit: 'unit',
        weight: 0,
        stock: 0,
        status: 'DRAFT',
        isFeatured: false,
        supportsRefill: true,
    });

    const uploadFilesToServer = async (files: UploadedFile[]) => {
        // This would upload files to your file storage service (e.g., AWS S3, Cloudinary)
        // For now, we'll assume files are already uploaded or use placeholder URLs
        const uploadedUrls = await Promise.all(
            files.map(async (file) => {
                if (file.file) {
                    // TODO: Implement actual file upload to your storage service
                    // const formData = new FormData();
                    // formData.append('file', file.file);
                    // const response = await fetch('/api/upload', { method: 'POST', body: formData });
                    // const data = await response.json();
                    // return { ...file, url: data.url };

                    // For now, return the file object URL as placeholder
                    return { ...file, url: file.preview || file.url };
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

            // Upload files to server
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

            // Create product with images and videos
            const token = localStorage.getItem('token');
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

            const response = await fetch(`${API_BASE}/api/admin/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...formData,
                    images,
                    videos,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create product');
            }

            alert('Product created successfully!');
            router.push('/admin/products');
        } catch (error: any) {
            console.error('Failed to create product:', error);
            alert(error.message || 'Failed to create product');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-text-primary">Create New Product</h1>
                <p className="text-text-secondary mt-2">Add a new product to your catalog</p>
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
                                placeholder="e.g., Traditional Jollof Rice"
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
                                placeholder="Describe your product..."
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
                                    placeholder="0.00"
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
                                    placeholder="0"
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
                                    placeholder="unit, kg, pack, etc."
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
                                    placeholder="0.00"
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
                                placeholder="Enter category ID or leave blank"
                            />
                            <p className="text-xs text-text-secondary mt-1">
                                Optional: Will use default category if not provided
                            </p>
                        </div>
                    </div>
                </div>

                {/* Media Upload */}
                <div className="bg-surface border border-border rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">
                        Product Media
                    </h2>
                    <p className="text-sm text-text-secondary mb-4">
                        Upload product images and videos. The first image will be set as primary by default.
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
                                    <span className="text-sm text-text-primary">Draft (not visible to customers)</span>
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
                                    <span className="text-sm text-text-primary">Active (visible to customers)</span>
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
                        {saving ? 'Creating Product...' : 'Create Product'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.back()}
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
