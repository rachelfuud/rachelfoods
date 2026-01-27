'use client';

import { useState } from 'react';
import { Product, ProductVariant } from '@/lib/types';
import { formatCurrency } from '@/lib/currency';
import VariantSelector from './VariantSelector';
import Link from 'next/link';
import { PaymentIcons } from './PaymentIcons';

interface ProductDetailClientProps {
    product: Product;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
    // Select default variant or first active variant
    const defaultVariant = product.variants?.find(v => v.isDefault && v.isActive) ||
        product.variants?.find(v => v.isActive);

    const [selectedVariantId, setSelectedVariantId] = useState<string>(
        defaultVariant?.id || ''
    );

    const selectedVariant = product.variants?.find(v => v.id === selectedVariantId);

    // Use variant price/stock if available, otherwise fall back to product
    const currentPrice = selectedVariant?.price ?? product.price;
    const currentStock = selectedVariant?.stock ?? product.stock;
    // Fix: Check stock > 0 directly, don't rely on isAvailable flag which may be false
    const isAvailable = selectedVariant ? selectedVariant.stock > 0 : currentStock > 0;

    const hasDiscount = product.compareAtPrice && product.compareAtPrice > currentPrice;
    const discountPercent = hasDiscount
        ? Math.round(((product.compareAtPrice! - currentPrice) / product.compareAtPrice!) * 100)
        : 0;

    const handleAddToCart = () => {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');

        // Use variant ID if available
        const cartKey = selectedVariantId || product.id;
        const existingItem = cart.find((item: any) =>
            selectedVariantId ? item.variantId === selectedVariantId : item.productId === product.id
        );

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                productId: product.id,
                variantId: selectedVariantId || null,
                product: product,
                variant: selectedVariant || null,
                quantity: 1,
            });
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));
        alert('Added to cart!');
    };

    return (
        <>
            <div className="flex items-center gap-3 mb-4">
                {product.isFeatured && (
                    <div className="inline-block px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm font-semibold">
                        ⭐ Featured
                    </div>
                )}
                <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                    🔄 Easy Refill Available
                </div>
            </div>

            <h1 className="text-4xl font-bold mb-4">{product.name}</h1>

            <div className="flex items-baseline gap-3 mb-6">
                <span className="text-4xl font-bold text-primary">
                    {formatCurrency(currentPrice)}
                </span>
                {hasDiscount && (
                    <span className="text-xl text-foreground/50 line-through">
                        {formatCurrency(product.compareAtPrice!)}
                    </span>
                )}
                <span className="text-lg text-foreground/70">/ {product.unit}</span>
            </div>

            <div className="mb-6">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${isAvailable
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {isAvailable ? (
                        <>✓ In Stock ({currentStock} available)</>
                    ) : (
                        <>✗ Out of Stock</>
                    )}
                </span>
            </div>

            {product.description && (
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-3">Description</h2>
                    <p className="text-foreground/70 leading-relaxed">{product.description}</p>
                </div>
            )}

            {/* Variant Selector */}
            {product.variants && product.variants.length > 1 && (
                <div className="mb-6">
                    <VariantSelector
                        variants={product.variants}
                        selectedVariantId={selectedVariantId}
                        onVariantChange={setSelectedVariantId}
                    />
                </div>
            )}

            {isAvailable && (
                <div className="space-y-4">
                    <button
                        onClick={handleAddToCart}
                        className="w-full py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
                    >
                        Add to Cart
                    </button>

                    <Link
                        href="/cart"
                        className="block w-full py-4 border-2 border-primary text-primary text-center rounded-lg font-semibold text-lg hover:bg-primary/5 transition-colors"
                    >
                        View Cart
                    </Link>
                </div>
            )}

            {product.supportsRefill && (
                <div className="mt-8 p-6 bg-linear-to-br from-primary/5 to-secondary/5 rounded-lg border border-primary/20">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        🔄 Kitchen Refill Made Easy
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <div className="text-2xl mb-2">1️⃣</div>
                            <h4 className="font-semibold mb-1">Buy Once</h4>
                            <p className="text-sm text-foreground/70">
                                Order this product now
                            </p>
                        </div>
                        <div>
                            <div className="text-2xl mb-2">2️⃣</div>
                            <h4 className="font-semibold mb-1">Refill Anytime</h4>
                            <p className="text-sm text-foreground/70">
                                Reorder with one click from your orders
                            </p>
                        </div>
                        <div>
                            <div className="text-2xl mb-2">3️⃣</div>
                            <h4 className="font-semibold mb-1">Save Time</h4>
                            <p className="text-sm text-foreground/70">
                                Skip re-selection and checkout faster
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-8 p-6 bg-muted rounded-lg">
                <h3 className="font-semibold mb-3">🛡️ Quality Guarantee</h3>
                <p className="text-sm text-foreground/70 mb-4">
                    All orders are confirmed by the seller before payment.
                    Your satisfaction is our priority.
                </p>
                <PaymentIcons />
            </div>
        </>
    );
}
