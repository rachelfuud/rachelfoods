'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
    productId: string;
    variantId?: string | null;
    product: any;
    variant?: any | null;
    quantity: number;
}

interface CartContextType {
    items: CartItem[];
    itemCount: number;
    addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
    removeFromCart: (productId: string, variantId?: string | null) => void;
    updateQuantity: (productId: string, quantity: number, variantId?: string | null) => void;
    clearCart: () => void;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            try {
                setItems(JSON.parse(savedCart));
            } catch (error) {
                console.error('Failed to parse cart:', error);
            }
        }
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(items));
        window.dispatchEvent(new Event('cartUpdated'));
    }, [items]);

    const itemCount = items.filter(item => item.quantity > 0).reduce((total, item) => total + item.quantity, 0);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const addToCart = (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
        setItems((prevItems) => {
            const existingItemIndex = prevItems.findIndex((i) =>
                i.productId === item.productId &&
                (item.variantId ? i.variantId === item.variantId : !i.variantId)
            );

            if (existingItemIndex !== -1) {
                const newItems = [...prevItems];
                newItems[existingItemIndex].quantity += quantity;
                showToast(`Updated ${item.product.name} quantity to ${newItems[existingItemIndex].quantity}`, 'success');
                return newItems;
            }

            showToast(`Added ${item.product.name} to cart!`, 'success');
            return [...prevItems, { ...item, quantity }];
        });
    };

    const removeFromCart = (productId: string, variantId?: string | null) => {
        setItems((prevItems) => {
            const item = prevItems.find((i) =>
                i.productId === productId &&
                (variantId ? i.variantId === variantId : !i.variantId)
            );
            if (item) {
                showToast(`Removed ${item.product.name} from cart`, 'info');
            }
            return prevItems.filter((i) =>
                !(i.productId === productId &&
                    (variantId ? i.variantId === variantId : !i.variantId))
            );
        });
    };

    const updateQuantity = (productId: string, quantity: number, variantId?: string | null) => {
        if (quantity <= 0) {
            removeFromCart(productId, variantId);
            return;
        }

        setItems((prevItems) =>
            prevItems.map((item) =>
                item.productId === productId &&
                    (variantId ? item.variantId === variantId : !item.variantId)
                    ? { ...item, quantity }
                    : item
            )
        );
    };

    const clearCart = () => {
        setItems([]);
        showToast('Cart cleared', 'info');
    };

    return (
        <CartContext.Provider
            value={{
                items,
                itemCount,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                showToast,
            }}
        >
            {children}

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
                    <div
                        className={`px-6 py-4 rounded-lg shadow-lg border-2 ${toast.type === 'success'
                            ? 'bg-green-50 border-green-500 text-green-900'
                            : toast.type === 'error'
                                ? 'bg-red-50 border-red-500 text-red-900'
                                : 'bg-blue-50 border-blue-500 text-blue-900'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">
                                {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : 'ℹ'}
                            </span>
                            <span className="font-semibold">{toast.message}</span>
                        </div>
                    </div>
                </div>
            )}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
