'use client';

import { Product } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { formatCurrency } from '@/lib/currency';
import React from 'react';
import { useAuth } from '@/components/AuthProvider';

interface ProductCardProps {
    product: Product;
}

export const ProductCard = React.memo(function ProductCard({ product }: ProductCardProps) {
    const { isAdmin } = useAuth();

    // Defensive: Convert price to number if it's a string (backend Decimal)
    const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
    const comparePrice = product.compareAtPrice
        ? (typeof product.compareAtPrice === 'string' ? parseFloat(product.compareAtPrice) : product.compareAtPrice)
        : null;

    const hasDiscount = comparePrice && comparePrice > price;
    const discountPercent = hasDiscount
        ? Math.round(((comparePrice - price) / comparePrice) * 100)
        : 0;

    // Defensive: Handle missing isAvailable and isFeatured fields
    const totalStock = product.totalStock ?? product.stock;
    const isOutOfStock = totalStock === 0;
    const isAvailable = product.isAvailable ?? (totalStock > 0);
    const isFeatured = product.isFeatured ?? false;
    const status = product.status ?? 'ACTIVE';

    // Get badge styling based on status
    const getStatusBadgeStyles = () => {
        switch (status) {
            case 'DRAFT':
                return 'bg-linear-to-r from-yellow-50 to-yellow-100 text-yellow-800 border-yellow-300 dark:from-yellow-900/30 dark:to-yellow-800/20 dark:text-yellow-400 dark:border-yellow-700';
            case 'DISABLED':
                return 'bg-linear-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-300 dark:from-gray-900/30 dark:to-gray-800/20 dark:text-gray-400 dark:border-gray-700';
            case 'ARCHIVED':
                return 'bg-linear-to-r from-red-50 to-red-100 text-red-800 border-red-300 dark:from-red-900/30 dark:to-red-800/20 dark:text-red-400 dark:border-red-700';
            case 'ACTIVE':
            default:
                return 'bg-linear-to-r from-green-50 to-green-100 text-green-800 border-green-300 dark:from-green-900/30 dark:to-green-800/20 dark:text-green-400 dark:border-green-700';
        }
    };

    return (
        <Link href={`/products/${product.slug}`}>
            <div className={`border-2 border-border rounded-2xl p-5 hover:shadow-2xl hover:border-brand-accent/50 transition-all duration-300 bg-linear-to-br from-brand-surface to-brand-muted/30 dark:from-surface dark:to-surface-elevated group ${status === 'DISABLED' ? 'opacity-60' : ''}`}>
                {product.imageUrl ? (
                    <div className="relative aspect-square mb-4 rounded-xl overflow-hidden bg-muted ring-2 ring-border group-hover:ring-brand-accent/30 transition-all">
                        <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        {hasDiscount && (
                            <div className="absolute top-3 right-3 bg-linear-to-r from-accent-500 to-accent-600 text-white px-3 py-2 rounded-xl text-sm font-bold shadow-lg backdrop-blur-sm">
                                -{discountPercent}%
                            </div>
                        )}
                        {isOutOfStock && (
                            <div className="absolute top-3 left-3 bg-linear-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg backdrop-blur-sm animate-pulse">
                                OUT OF STOCK
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="relative aspect-square mb-4 rounded-xl bg-linear-to-br from-muted to-brand-muted flex items-center justify-center ring-2 ring-border">
                        <span className="text-5xl">🍽️</span>
                        {isOutOfStock && (
                            <div className="absolute top-3 left-3 bg-linear-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg backdrop-blur-sm animate-pulse">
                                OUT OF STOCK
                            </div>
                        )}
                    </div>
                )}

                <h3 className="font-bold text-lg mb-2 group-hover:text-brand-primary dark:group-hover:text-primary-400 transition-colors">
                    {product.name}
                </h3>

                {product.supportsRefill && (
                    <div className="text-xs text-brand-accent/70 dark:text-brand-accent/60 mb-2 font-medium">
                        Refill available
                    </div>
                )}

                {product.description && (
                    <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                        {product.description}
                    </p>
                )}

                <div className="mb-3">
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-3xl font-bold bg-linear-to-r from-brand-primary to-primary-600 dark:from-primary-400 dark:to-primary-600 bg-clip-text text-transparent">
                            {formatCurrency(price)}
                        </span>
                        {hasDiscount && comparePrice && (
                            <span className="text-sm text-text-tertiary line-through">
                                {formatCurrency(comparePrice)}
                            </span>
                        )}
                        <span className="text-sm text-text-secondary">/ {product.unit}</span>
                    </div>
                    <div className="text-xs text-text-tertiary">
                        Secure checkout · No hidden fees
                    </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full ${isOutOfStock ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                        {isOutOfStock ? 'Out of stock' : `${totalStock} in stock`}
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                        {isAdmin && status !== 'ACTIVE' && (
                            <span className={`text-xs px-3 py-1.5 rounded-full border-2 ${getStatusBadgeStyles()} font-bold shadow-sm`}>
                                {status}
                            </span>
                        )}
                        {isFeatured && (
                            <span className="text-xs bg-linear-to-r from-secondary-100 to-secondary-200 dark:from-secondary-900/30 dark:to-secondary-800/20 text-secondary-700 dark:text-secondary-400 px-3 py-1.5 rounded-full font-semibold border border-secondary-300 dark:border-secondary-700">
                                ⭐ Featured
                            </span>
                        )}
                    </div>
                </div>

                {/* Kitchen Refill CTA */}
                {product.supportsRefill && !isOutOfStock && (
                    <div className="mt-4 pt-4 border-t-2 border-dashed border-brand-accent/30">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-linear-to-r from-accent-50 to-accent-100 dark:from-accent-900/20 dark:to-accent-800/10 border border-accent-200 dark:border-accent-800 group-hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-linear-to-br from-accent-400 to-accent-600 dark:from-accent-600 dark:to-accent-700 shadow-md">
                                <span className="text-xl">🔄</span>
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-bold text-accent-700 dark:text-accent-400">Refill Available</div>
                                <div className="text-xs text-accent-600 dark:text-accent-500">Quick reorder anytime</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Link>
    );
});
