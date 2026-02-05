'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateProduct } from '@/lib/hooks/useProducts';
import { CreateProductData } from '@/lib/api/endpoints/products';

export default function NewProductPage() {
    const router = useRouter();
    const createMutation = useCreateProduct();

    const [formData, setFormData] = useState<CreateProductData>({
        name: '',
        description: '',
        price: 0,
        categoryId: '',
        imageUrl: '',
        featured: false,
        status: 'DRAFT',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.description || formData.price <= 0) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            await createMutation.mutateAsync(formData);
            alert('Product created successfully!');
            router.push('/admin/products');
        } catch (error: any) {
            alert(error.message || 'Failed to create product');
        }
    };

    const handleChange = (field: keyof CreateProductData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const isLoading = createMutation.isPending;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-text-primary">Create New Product</h1>
                <p className="text-text-secondary mt-2">Add a new product to your catalog</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-lg p-6 space-y-6">
                {/* Product Name */}
                <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                        Product Name *
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="e.g., Traditional Jollof Rice"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                        Description *
                    </label>
                    <textarea
                        required
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Describe your product..."
                    />
                </div>

                {/* Price */}
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
                        onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="0.00"
                    />
                </div>

                {/* Category ID */}
                <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                        Category ID
                    </label>
                    <input
                        type="text"
                        value={formData.categoryId}
                        onChange={(e) => handleChange('categoryId', e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Enter category ID or leave blank"
                    />
                    <p className="text-xs text-text-secondary mt-1">
                        Optional: Will use default category if not provided
                    </p>
                </div>

                {/* Image URL */}
                <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                        Image URL
                    </label>
                    <input
                        type="url"
                        value={formData.imageUrl}
                        onChange={(e) => handleChange('imageUrl', e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-md bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="https://example.com/image.jpg"
                    />
                    {formData.imageUrl && (
                        <div className="mt-2">
                            <img
                                src={formData.imageUrl}
                                alt="Preview"
                                className="h-32 w-32 object-cover rounded-md border border-border"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder.jpg';
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Featured */}
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="featured"
                        checked={formData.featured}
                        onChange={(e) => handleChange('featured', e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                    />
                    <label htmlFor="featured" className="text-sm font-medium text-text-primary">
                        Feature this product on homepage
                    </label>
                </div>

                {/* Status */}
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
                                onChange={(e) => handleChange('status', e.target.value as 'DRAFT')}
                                className="w-4 h-4 border-border text-primary focus:ring-2 focus:ring-primary"
                            />
                            <span className="text-sm text-text-primary">Draft (not visible to customers)</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                name="status"
                                value="PUBLISHED"
                                checked={formData.status === 'PUBLISHED'}
                                onChange={(e) => handleChange('status', e.target.value as 'PUBLISHED')}
                                className="w-4 h-4 border-border text-primary focus:ring-2 focus:ring-primary"
                            />
                            <span className="text-sm text-text-primary">Published (visible to customers)</span>
                        </label>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4 border-t border-border">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {isLoading ? 'Creating...' : 'Create Product'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        disabled={isLoading}
                        className="px-6 py-2 border border-border rounded-md hover:bg-muted text-text-primary font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
