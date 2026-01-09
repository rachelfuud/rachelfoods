'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { formatCurrency } from '@/lib/currency';
import Link from 'next/link';
import { CartItem, Product } from '@/lib/types';

export default function CartPage() {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    useEffect(() => {
        // Load cart from localStorage
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            setCartItems(JSON.parse(savedCart));
        }
    }, []);

    const updateQuantity = (productId: string, newQuantity: number) => {
        const updated = cartItems.map(item =>
            item.productId === productId ? { ...item, quantity: newQuantity } : item
        );
        setCartItems(updated);
        localStorage.setItem('cart', JSON.stringify(updated));
    };

    const removeItem = (productId: string) => {
        const updated = cartItems.filter(item => item.productId !== productId);
        setCartItems(updated);
        localStorage.setItem('cart', JSON.stringify(updated));
    };

    const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>

                {cartItems.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🛒</div>
                        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
                        <p className="text-foreground/70 mb-6">
                            Add some products to get started!
                        </p>
                        <Link
                            href="/catalog"
                            className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Browse Products
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Cart Items */}
                        <div className="lg:col-span-2 space-y-4">
                            {cartItems.map((item) => (
                                <div
                                    key={item.productId}
                                    className="flex gap-4 p-4 border border-border rounded-lg bg-background"
                                >
                                    <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                                        🍽️
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg mb-1">{item.product.name}</h3>
                                        <p className="text-foreground/70 text-sm mb-2">
                                            {formatCurrency(item.product.price)} / {item.product.unit}
                                        </p>

                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                                                className="w-8 h-8 border border-border rounded hover:bg-muted"
                                            >
                                                -
                                            </button>
                                            <span className="font-semibold">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                                className="w-8 h-8 border border-border rounded hover:bg-muted"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="font-bold text-lg mb-2">
                                            {formatCurrency(item.product.price * item.quantity)}
                                        </div>
                                        <button
                                            onClick={() => removeItem(item.productId)}
                                            className="text-red-600 text-sm hover:underline"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Order Summary */}
                        <div>
                            <div className="border border-border rounded-lg p-6 bg-background sticky top-24">
                                <h2 className="text-2xl font-bold mb-4">Order Summary</h2>

                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between">
                                        <span className="text-foreground/70">Subtotal</span>
                                        <span className="font-semibold">{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-foreground/70">Tax (10%)</span>
                                        <span className="font-semibold">{formatCurrency(tax)}</span>
                                    </div>
                                    <div className="border-t border-border pt-3 flex justify-between text-lg">
                                        <span className="font-bold">Total</span>
                                        <span className="font-bold text-primary">{formatCurrency(total)}</span>
                                    </div>
                                </div>

                                <Link
                                    href="/checkout"
                                    className="block w-full py-3 bg-primary text-white text-center rounded-lg font-semibold hover:opacity-90 transition-opacity"
                                >
                                    Proceed to Checkout
                                </Link>

                                <Link
                                    href="/catalog"
                                    className="block w-full mt-3 py-3 border border-primary text-primary text-center rounded-lg font-semibold hover:bg-primary/5 transition-colors"
                                >
                                    Continue Shopping
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
