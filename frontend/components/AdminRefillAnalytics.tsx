'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';

interface RefillAnalytics {
    totalActiveProfiles: number;
    topRefillProducts: Array<{
        product: {
            id: string;
            name: string;
            imageUrl: string | null;
            supportsRefill: boolean;
        };
        refillCount: number;
    }>;
}

export default function AdminRefillAnalytics() {
    const [analytics, setAnalytics] = useState<RefillAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    async function loadAnalytics() {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Not authenticated');

            const res = await fetch('http://localhost:3001/api/refill/analytics', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error('Failed to fetch analytics');
            const data = await res.json();
            setAnalytics(data);
        } catch (err: any) {
            console.error('Failed to load refill analytics:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="p-4">
                <LoadingSpinner size="md" text="Loading analytics..." centered />
            </div>
        );
    }

    if (!analytics) {
        return <div className="p-4 text-red-500">Failed to load analytics</div>;
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Refill Analytics</h2>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="text-3xl font-bold text-blue-600">
                    {analytics.totalActiveProfiles}
                </div>
                <div className="text-gray-600 mt-1">Active Refill Profiles</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Top Refill Products</h3>
                <div className="space-y-3">
                    {analytics.topRefillProducts.map((item, index) => (
                        <div
                            key={item.product.id}
                            className="flex items-center gap-4 p-3 border rounded hover:bg-gray-50"
                        >
                            <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full font-bold text-blue-600">
                                {index + 1}
                            </div>
                            {item.product.imageUrl && (
                                <Image
                                    src={item.product.imageUrl}
                                    alt={item.product.name}
                                    width={48}
                                    height={48}
                                    className="object-cover rounded"
                                />
                            )}
                            <div className="flex-1">
                                <div className="font-medium">{item.product.name}</div>
                                <div className="text-sm text-gray-500">
                                    {item.refillCount} active refill{item.refillCount !== 1 ? 's' : ''}
                                </div>
                            </div>
                            {!item.product.supportsRefill && (
                                <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded">
                                    Refill Disabled
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
