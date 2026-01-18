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
                <h2 className="text-2xl font-bold mb-2">No products found</h2>
                <p className="text-foreground/70">
                    {isAdmin
                        ? 'Add products from the admin panel to get started'
                        : 'Products will be displayed here once added by the seller'}
                </p>
            </div>
        );
    }

    return (
        <>
            {isAdmin && products.some(p => p.status === 'DRAFT' || p.status === 'DISABLED') && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <h3 className="font-semibold text-yellow-900 mb-1">Admin View</h3>
                            <p className="text-sm text-yellow-800">
                                You're viewing products in all statuses. Buyers only see ACTIVE products.
                                DRAFT products are marked with yellow badges, DISABLED products appear grayed out.
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
