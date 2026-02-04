'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import Link from 'next/link';

interface RefillProfile {
    id: string;
    quantity: number;
    product: {
        id: string;
        name: string;
        price: number;
        imageUrl: string | null;
    };
    variant?: {
        id: string;
        name: string;
        price: number;
    } | null;
}

export default function RefillSection() {
    const [refills, setRefills] = useState<RefillProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [orderingId, setOrderingId] = useState<string | null>(null);

    useEffect(() => {
        loadRefills();
    }, []);

    async function loadRefills() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }
            const data = await api.getUserRefills();
            setRefills(data);
        } catch (err: any) {
            console.error('Failed to load refills:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleQuickRefill(profileId: string) {
        try {
            setOrderingId(profileId);
            const order = await api.createRefillOrder({
                refillProfileId: profileId,
                paymentMethod: 'PREPAID', // User will choose payment method in checkout
            });
            alert(`Refill order created! Order #${order.orderNumber}`);
            window.location.href = `/orders/${order.id}`;
        } catch (err: any) {
            alert(`Failed to create refill order: ${err.message}`);
        } finally {
            setOrderingId(null);
        }
    }

    async function handleRemove(profileId: string) {
        if (!confirm('Remove this item from your refill list?')) return;

        try {
            await api.deleteRefillProfile(profileId);
            setRefills(refills.filter(r => r.id !== profileId));
        } catch (err: any) {
            alert(`Failed to remove: ${err.message}`);
        }
    }

    if (!loading && refills.length === 0) {
        return null; // Don't show section if no refills
    }

    return (
        <section className="py-12 bg-gray-50">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            🔄 Quick Refill
                        </h2>
                        <p className="text-gray-600 mt-1">
                            Running low? Refill in 2 clicks
                        </p>
                    </div>
                    <Link
                        href="/refills"
                        className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                        View All →
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500">Loading your refill items...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-8">
                        <p className="text-red-500">{error}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {refills.slice(0, 4).map((refill) => (
                            <div
                                key={refill.id}
                                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition"
                            >
                                <div className="flex items-start gap-3">
                                    {refill.product.imageUrl && (
                                        <Image
                                            src={refill.product.imageUrl}
                                            alt={refill.product.name}
                                            width={64}
                                            height={64}
                                            className="object-cover rounded"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <h3 className="font-medium text-gray-900 text-sm">
                                            {refill.product.name}
                                        </h3>
                                        {refill.variant && (
                                            <p className="text-xs text-gray-500">
                                                {refill.variant.name}
                                            </p>
                                        )}
                                        <p className="text-sm font-bold text-gray-900 mt-1">
                                            ${(refill.variant?.price || refill.product.price).toFixed(2)}
                                            <span className="text-xs text-gray-500 font-normal ml-1">
                                                x {refill.quantity}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <button
                                        onClick={() => handleQuickRefill(refill.id)}
                                        disabled={orderingId === refill.id}
                                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >
                                        {orderingId === refill.id ? 'Creating...' : 'Refill Now'}
                                    </button>
                                    <button
                                        onClick={() => handleRemove(refill.id)}
                                        className="px-3 py-2 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
