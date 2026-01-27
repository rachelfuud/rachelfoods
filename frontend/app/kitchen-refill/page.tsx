'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { Product } from '@/lib/types';
import { formatCurrency } from '@/lib/currency';
import Image from 'next/image';

interface RefillItem extends Product {
    lastOrderedQuantity?: number;
    lastOrderedDate?: string;
    refillFrequency?: number; // Days between orders
}

export default function KitchenRefillPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [loading, setLoading] = useState(true);
    const [previouslyOrdered, setPreviouslyOrdered] = useState<RefillItem[]>([]);
    const [otherProducts, setOtherProducts] = useState<RefillItem[]>([]);
    const [cart, setCart] = useState<Map<string, number>>(new Map());

    useEffect(() => {
        // Kitchen Refill is now public - no auth required
        loadRefillData();
    }, []);

    async function loadRefillData() {
        try {
            setLoading(true);

            // Fetch all products
            const allProducts = await api.getProducts();

            // Fetch user's order history (this would come from a backend API)
            // For now, we'll simulate with localStorage
            const orderHistory = getOrderHistory();

            // Separate products into previously ordered and others
            const ordered: RefillItem[] = [];
            const others: RefillItem[] = [];
            const initialCart = new Map<string, number>();

            allProducts.forEach((product: Product) => {
                const history = orderHistory.get(product.id);

                if (history) {
                    const refillItem: RefillItem = {
                        ...product,
                        lastOrderedQuantity: history.quantity,
                        lastOrderedDate: history.date,
                        refillFrequency: history.frequency
                    };
                    ordered.push(refillItem);
                    // Auto-add to cart with last ordered quantity
                    initialCart.set(product.id, history.quantity);
                } else {
                    others.push(product);
                }
            });

            setPreviouslyOrdered(ordered);
            setOtherProducts(others);
            setCart(initialCart);
        } catch (error) {
            console.error('Failed to load refill data:', error);
        } finally {
            setLoading(false);
        }
    }

    // Simulate order history from localStorage
    function getOrderHistory(): Map<string, { quantity: number; date: string; frequency: number }> {
        const history = new Map();
        const stored = localStorage.getItem('orderHistory');
        if (stored) {
            const data = JSON.parse(stored);
            Object.entries(data).forEach(([id, value]: [string, any]) => {
                history.set(id, value);
            });
        }
        return history;
    }

    function handleQuantityChange(productId: string, quantity: number) {
        if (quantity <= 0) {
            // Remove from cart
            const newCart = new Map(cart);
            newCart.delete(productId);
            setCart(newCart);
        } else {
            // Add/update in cart
            const newCart = new Map(cart);
            newCart.set(productId, quantity);
            setCart(newCart);
        }
    }

    function handleRemove(productId: string) {
        const newCart = new Map(cart);
        newCart.delete(productId);
        setCart(newCart);
    }

    async function handleAddAllToCart() {
        try {
            // In a real implementation, this would call the cart API
            const items = Array.from(cart.entries()).map(([productId, quantity]) => ({
                productId,
                quantity
            }));

            alert(`Added ${items.length} items to cart! Total items: ${items.reduce((sum, item) => sum + item.quantity, 0)}`);

            // Save to localStorage for persistence
            const orderHistory: any = {};
            cart.forEach((quantity, productId) => {
                orderHistory[productId] = {
                    quantity,
                    date: new Date().toISOString(),
                    frequency: 7 // Default 7 days
                };
            });
            localStorage.setItem('orderHistory', JSON.stringify(orderHistory));

            router.push('/cart');
        } catch (error) {
            console.error('Failed to add to cart:', error);
            alert('Failed to add items to cart');
        }
    }

    function ProductRow({ product, isOrdered }: { product: RefillItem; isOrdered: boolean }) {
        const inCart = cart.has(product.id);
        const quantity = cart.get(product.id) || product.lastOrderedQuantity || 1;
        const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;

        return (
            <div className={`border-2 rounded-xl p-4 mb-4 transition-all ${inCart
                ? 'border-primary bg-primary-50 dark:bg-primary-950/20'
                : 'border-border bg-background hover:border-primary/50'
                }`}>
                <div className="flex items-center gap-4">
                    {/* Checkbox */}
                    <div className="shrink-0">
                        <input
                            type="checkbox"
                            checked={inCart}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    handleQuantityChange(product.id, quantity);
                                } else {
                                    handleRemove(product.id);
                                }
                            }}
                            className="w-5 h-5 rounded border-2 border-primary text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                        />
                    </div>

                    {/* Thumbnail */}
                    <div className="shrink-0 w-20 h-20 relative rounded-lg overflow-hidden bg-muted">
                        {product.imageUrl ? (
                            <Image
                                src={product.imageUrl}
                                alt={product.name}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">
                                🍽️
                            </div>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                        <p className="text-sm text-foreground/70 mb-2 line-clamp-2">
                            {product.description}
                        </p>
                        <div className="flex items-center gap-4 flex-wrap">
                            <span className="text-xl font-bold text-primary">
                                {formatCurrency(price)}
                            </span>
                            <span className="text-sm text-foreground/60">
                                / {product.unit}
                            </span>
                            {isOrdered && product.lastOrderedDate && (
                                <span className="text-xs bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-400 px-2 py-1 rounded-full">
                                    Last ordered: {new Date(product.lastOrderedDate).toLocaleDateString()}
                                </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-full ${(product.totalStock ?? 0) > 0
                                ? 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                {(product.totalStock ?? 0) > 0 ? `${product.totalStock} in stock` : 'Out of stock'}
                            </span>
                        </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="shrink-0 flex items-center gap-3">
                        <div className="flex items-center gap-2 border-2 border-border rounded-lg">
                            <button
                                onClick={() => handleQuantityChange(product.id, Math.max(0, quantity - 1))}
                                className="px-3 py-2 hover:bg-muted transition-colors"
                                disabled={product.totalStock === 0}
                            >
                                −
                            </button>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                                className="w-16 text-center border-none bg-transparent focus:outline-none"
                                min="0"
                                disabled={product.totalStock === 0}
                            />
                            <button
                                onClick={() => handleQuantityChange(product.id, quantity + 1)}
                                className="px-3 py-2 hover:bg-muted transition-colors"
                                disabled={product.totalStock === 0}
                            >
                                +
                            </button>
                        </div>

                        {inCart && (
                            <button
                                onClick={() => handleRemove(product.id)}
                                className="px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-semibold"
                            >
                                Remove
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    function ProductCard({ product, isOrdered }: { product: RefillItem; isOrdered: boolean }) {
        const inCart = cart.has(product.id);
        const quantity = cart.get(product.id) || product.lastOrderedQuantity || 1;
        const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;

        return (
            <div className={`border-2 rounded-xl p-4 transition-all ${inCart
                ? 'border-primary bg-primary-50 dark:bg-primary-950/20'
                : 'border-border bg-background hover:border-primary/50'
                }`}>
                {/* Checkbox at top */}
                <div className="flex justify-between items-start mb-3">
                    <input
                        type="checkbox"
                        checked={inCart}
                        onChange={(e) => {
                            if (e.target.checked) {
                                handleQuantityChange(product.id, quantity);
                            } else {
                                handleRemove(product.id);
                            }
                        }}
                        className="w-5 h-5 rounded border-2 border-primary text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                    />
                    {isOrdered && (
                        <span className="text-xs bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-400 px-2 py-1 rounded-full">
                            Previously ordered
                        </span>
                    )}
                </div>

                {/* Image */}
                <div className="relative aspect-square mb-4 rounded-lg overflow-hidden bg-muted">
                    {product.imageUrl ? (
                        <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl">
                            🍽️
                        </div>
                    )}
                </div>

                {/* Info */}
                <h3 className="font-bold text-lg mb-2 text-center">{product.name}</h3>
                <p className="text-sm text-foreground/70 mb-3 line-clamp-2 text-center">
                    {product.description}
                </p>

                <div className="text-center mb-3">
                    <div className="text-2xl font-bold text-primary mb-1">
                        {formatCurrency(price)}
                    </div>
                    <div className="text-sm text-foreground/60">/ {product.unit}</div>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-center gap-2 mb-3">
                    <button
                        onClick={() => handleQuantityChange(product.id, Math.max(0, quantity - 1))}
                        className="px-3 py-1 border-2 border-border rounded hover:bg-muted"
                        disabled={product.totalStock === 0}
                    >
                        −
                    </button>
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                        className="w-16 text-center border-2 border-border rounded py-1"
                        min="0"
                        disabled={product.totalStock === 0}
                    />
                    <button
                        onClick={() => handleQuantityChange(product.id, quantity + 1)}
                        className="px-3 py-1 border-2 border-border rounded hover:bg-muted"
                        disabled={product.totalStock === 0}
                    >
                        +
                    </button>
                </div>

                {inCart && (
                    <button
                        onClick={() => handleRemove(product.id)}
                        className="w-full py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-semibold"
                    >
                        Remove
                    </button>
                )}
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect in useEffect
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-4xl mb-4">🔄</div>
                        <p className="text-xl">Loading your kitchen refill...</p>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const totalItems = cart.size;
    const totalQuantity = Array.from(cart.values()).reduce((sum, qty) => sum + qty, 0);

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
                        <span className="text-5xl">🔄</span>
                        Kitchen Refill
                    </h1>
                    <p className="text-xl text-foreground/70 mb-4">
                        Are you running low on any of your ordered local foods items? Refill your kitchen now!
                    </p>

                    {/* View Toggle */}
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-foreground/60">
                            {totalItems} items selected ({totalQuantity} total quantity)
                        </div>
                        <div className="flex gap-2 border-2 border-border rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-4 py-2 rounded transition-colors ${viewMode === 'list'
                                    ? 'bg-primary text-white'
                                    : 'hover:bg-muted'
                                    }`}
                            >
                                📋 List
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-4 py-2 rounded transition-colors ${viewMode === 'grid'
                                    ? 'bg-primary text-white'
                                    : 'hover:bg-muted'
                                    }`}
                            >
                                ⊞ Grid
                            </button>
                        </div>
                    </div>
                </div>

                {/* Previously Ordered Section */}
                {previouslyOrdered.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <span>⭐</span>
                            Your Usual Orders
                        </h2>
                        {viewMode === 'list' ? (
                            <div>
                                {previouslyOrdered.map(product => (
                                    <ProductRow key={product.id} product={product} isOrdered={true} />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {previouslyOrdered.map(product => (
                                    <ProductCard key={product.id} product={product} isOrdered={true} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Other Products Section */}
                {otherProducts.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">
                            Discover More Products
                        </h2>
                        {viewMode === 'list' ? (
                            <div>
                                {otherProducts.map(product => (
                                    <ProductRow key={product.id} product={product} isOrdered={false} />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {otherProducts.map(product => (
                                    <ProductCard key={product.id} product={product} isOrdered={false} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Add to Cart Button */}
                {totalItems > 0 && (
                    <div className="fixed bottom-8 right-8 z-50">
                        <button
                            onClick={handleAddAllToCart}
                            className="px-8 py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-2xl hover:scale-105 transition-transform flex items-center gap-3"
                        >
                            <span>🛒</span>
                            Add {totalItems} items to Cart
                            <span className="bg-white text-primary px-3 py-1 rounded-full text-sm">
                                {totalQuantity}
                            </span>
                        </button>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
