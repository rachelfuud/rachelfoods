'use client';

import { Product } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { formatCurrency } from '@/lib/currency';

interface ProductCardProps {
    product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
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
    const isAvailable = product.isAvailable ?? (product.stock > 0);
    const isFeatured = product.isFeatured ?? false;

    return (
        <Link href={`/products/${product.slug}`}>
            <div className="border border-border rounded-lg p-4 hover:shadow-lg transition-shadow bg-background group">
                {product.imageUrl ? (
                    <div className="relative aspect-square mb-4 rounded-lg overflow-hidden bg-muted">
                        <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                        />
                        {hasDiscount && (
                            <div className="absolute top-2 right-2 bg-accent text-white px-2 py-1 rounded-md text-sm font-bold">
                                -{discountPercent}%
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="aspect-square mb-4 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-4xl">🍽️</span>
                    </div>
                )}

                <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                    {product.name}
                </h3>

                {product.description && (
                    <p className="text-sm text-foreground/70 mb-3 line-clamp-2">
                        {product.description}
                    </p>
                )}

                <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-primary">
                        {formatCurrency(price)}
                    </span>
                    {hasDiscount && comparePrice && (
                        <span className="text-sm text-foreground/50 line-through">
                            {formatCurrency(comparePrice)}
                        </span>
                    )}
                    <span className="text-sm text-foreground/70">/ {product.unit}</span>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={`text-sm ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                        {isAvailable ? `${product.stock} in stock` : 'Out of stock'}
                    </span>

                    <div className="flex items-center gap-2">
                        {isFeatured && (
                            <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded">
                                Featured
                            </span>
                        )}
                        {product.supportsRefill && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded flex items-center gap-1">
                                🔄 Refill Available
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
