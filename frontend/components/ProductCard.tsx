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
                            onError={(e) => {
                                // Fallback to placeholder if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/10"><span class="text-6xl">🍽️</span></div>';
                            }}
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
                    <div className="relative aspect-square mb-4 rounded-xl bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/10 flex items-center justify-center ring-2 ring-border">
                        <span className="text-6xl">🍽️</span>
                        {isOutOfStock && (
                            <div className="absolute top-3 left-3 bg-linear-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg backdrop-blur-sm animate-pulse">
                                OUT OF STOCK
                            </div>
                        )}
                    </div>
                )}

                <h3 className="font-bold text-lg mb-2 text-center group-hover:text-brand-primary dark:group-hover:text-primary-400 transition-colors">
                    {product.name}
                </h3>

                {product.description && (
                    <p className="text-sm text-text-secondary mb-3 line-clamp-2 text-center">
                        {product.description}
                    </p>
                )}

                <div className="mb-3 text-center">
                    <div className="flex items-baseline gap-2 mb-1 justify-center">
                        <span className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                            {formatCurrency(price)}
                        </span>
                        {hasDiscount && comparePrice && (
                            <span className="text-sm text-text-tertiary line-through">
                                {formatCurrency(comparePrice)}
                            </span>
                        )}
                        <span className="text-sm text-foreground/70 dark:text-foreground/60">/ {product.unit}</span>
                    </div>
                    <div className="text-xs text-foreground/60 dark:text-foreground/50">
                        Secure checkout · No hidden fees
                    </div>
                </div>

                <div className="flex items-center justify-center flex-wrap gap-2 mb-3">
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full ${isOutOfStock ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-400'}`}>
                        {isOutOfStock ? 'Out of stock' : `${totalStock} in stock`}
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                        {isAdmin && status !== 'ACTIVE' && (
                            <span className={`text-xs px-3 py-1.5 rounded-full border-2 ${getStatusBadgeStyles()} font-bold shadow-sm`}>
                                {status}
                            </span>
                        )}

                    </div>
                </div>
            </div>
        </Link>
    );
});
