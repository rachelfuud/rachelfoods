'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function AdminProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchProducts();
    }, [page, search]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const data = await api.getAdminProducts({
                page,
                limit: 20,
                search: search || undefined,
                includeDisabled: true,
            });
            setProducts(data.data || []);
            setTotalPages(data.pagination?.totalPages || 1);
        } catch (error: any) {
            console.error('Failed to fetch products:', error);
            alert(`Failed to load products: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

        try {
            await api.deleteAdminProduct(id);
            alert(`Failed to delete product: ${error.message}`);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-primary">Products</h1>
                <Link
                    href="/admin/products/new"
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                >
                    ➕ Add Product
                </Link>
            </div>

            {/* Search */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    className="w-full max-w-md px-4 py-2 border border-border rounded-md bg-surface text-text-primary"
                />
            </div>

            {/* Products Table */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                </div>
            ) : (
                <>
                    <div className="bg-surface border border-border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-surface-elevated">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Product
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Price
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Stock
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {products.map((product) => (
                                    <tr key={product.id} className="hover:bg-surface-elevated">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-medium text-text-primary">
                                                    {product.name}
                                                </div>
                                                <div className="text-sm text-text-tertiary">
                                                    SKU: {product.sku}
                                                </div>
                                                {product.isFeatured && (
                                                    <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-accent/20 text-accent rounded">
                                                        Featured
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-secondary">
                                            {product.categories?.name || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-primary font-medium">
                                            {formatCurrency(product.price)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-secondary">
                                            {product.stock} {product.unit}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.status === 'ACTIVE'
                                                    ? 'bg-success/20 text-success'
                                                    : 'bg-error/20 text-error'
                                                    }`}
                                            >
                                                {product.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex gap-2">
                                                <Link
                                                    href={`/admin/products/${product.id}/edit`}
                                                    className="text-primary hover:text-primary/80"
                                                >
                                                    Edit
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(product.id, product.name)}
                                                    className="text-error hover:text-error/80"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-6">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 border border-border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface"
                            >
                                Previous
                            </button>
                            <span className="px-4 py-2 text-text-secondary">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-4 py-2 border border-border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
