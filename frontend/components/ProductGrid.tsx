'use client';

import { Product } from '@/lib/types';
import { ProductCard } from '@/components/ProductCard';
import { useAuth } from '@/components/AuthProvider';
import { useMemo } from 'react';

interface ProductGridProps {
    products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
    const { isAdmin } = useAuth();

    // Filter products based on user role
    const visibleProducts = useMemo(() => {
        if (isAdmin) {
            // Admins see all products including DRAFT and DISABLED
            return products;
        } else {
            // Buyers only see ACTIVE products
            return products.filter(p => !p.status || p.status === 'ACTIVE');
        }
    }, [products, isAdmin]);

    if (visibleProducts.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                {isAdmin ? (
                    <>
                        <h2 className="text-2xl font-bold mb-2">No products to display</h2>
                        <p className="text-foreground/70 mb-1">
                            Diagnostic: No products match current filters or all products are archived
                        </p>
                        <p className="text-sm text-text-tertiary">
                            Check product status in admin panel or add new products
                        </p>
                    </>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold mb-2">We're preparing something special</h2>
                        <p className="text-foreground/70">
                            Our selection is being updated. Check back soon for fresh products!
                        </p>
                    </>
                )}
            </div>
        );
    }

    return (
        <>
            {isAdmin && products.some(p => p.status === 'DRAFT' || p.status === 'DISABLED') && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-1">Admin View</h3>
                            <p className="text-sm text-yellow-800 dark:text-yellow-400">
                                You're viewing all products. Buyers only see items marked ACTIVE.
                                Yellow badges indicate unpublished items, grayed items are not visible to buyers.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {visibleProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </>
    );
}
