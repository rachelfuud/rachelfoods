'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { formatCurrency } from '@/lib/currency';
import Link from 'next/link';
import { Order } from '@/lib/types';

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: Fetch orders from backend with auth token
        setLoading(false);
        setOrders([]);
    }, []);

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold mb-8">My Orders</h1>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="text-4xl mb-4">⏳</div>
                        <p className="text-foreground/70">Loading orders...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">📦</div>
                        <h2 className="text-2xl font-bold mb-2">No orders yet</h2>
                        <p className="text-foreground/70 mb-6">
                            Start shopping to place your first order!
                        </p>
                        <Link
                            href="/catalog"
                            className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Browse Products
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                className="border border-border rounded-lg p-6 bg-background hover:shadow-lg transition-shadow"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg mb-1">
                                            Order #{order.orderNumber}
                                        </h3>
                                        <p className="text-sm text-foreground/70">
                                            Placed on {new Date(order.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${order.status === 'PENDING'
                                        ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                        : order.status === 'CONFIRMED'
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : order.status === 'DELIVERED'
                                                ? 'bg-green-50 text-green-700 border border-green-200'
                                                : 'bg-gray-50 text-gray-700 border border-gray-200'
                                        }`}>
                                        {order.status}
                                    </span>
                                </div>

                                <div className="border-t border-border pt-4 mb-4">
                                    <div className="text-2xl font-bold text-primary">
                                        {formatCurrency(order.totalAmount)}
                                    </div>
                                    <p className="text-sm text-foreground/70">
                                        {order.items.length} item(s)
                                    </p>
                                </div>

                                <Link
                                    href={`/orders/${order.id}`}
                                    className="inline-block px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
                                >
                                    View Details
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
