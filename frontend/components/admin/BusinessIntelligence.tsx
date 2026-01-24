'use client';

import React, { useEffect, useState } from 'react';
import { StatCard, EmptyState } from './StatCard';
import { formatCurrency } from '@/lib/utils';

interface Product {
    id: string;
    name: string;
    orderCount: number;
    revenue: number;
}

interface CustomerStats {
    totalCustomers: number;
    repeatCustomers: number;
    averageOrders: number;
}

export function BusinessIntelligence() {
    const [loading, setLoading] = useState(true);
    const [topProducts, setTopProducts] = useState<Product[]>([]);
    const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);
    const [refillStats, setRefillStats] = useState({ total: 0, percentage: 0 });
    const [couponStats, setCouponStats] = useState({ totalUsed: 0, totalDiscount: 0 });

    useEffect(() => {
        loadBIData();
    }, []);

    const loadBIData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) return;

            const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

            // Fetch admin products to analyze top sellers
            const productsRes = await fetch(`${API_BASE}/admin/products`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (productsRes.ok) {
                const productsData = await productsRes.json();
                // Sort by orderCount and take top 5
                const sorted = productsData.data
                    .sort((a: any, b: any) => (b.orderCount || 0) - (a.orderCount || 0))
                    .slice(0, 5)
                    .map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        orderCount: p.orderCount || 0,
                        revenue: (p.price || 0) * (p.orderCount || 0),
                    }));
                setTopProducts(sorted);
            }

            // For customer stats, we'd need order data - simulating for now
            // In real implementation, aggregate from orders API
            setCustomerStats({
                totalCustomers: 0, // Would calculate from unique userIds in orders
                repeatCustomers: 0, // Would calculate users with >1 order
                averageOrders: 0, // Would calculate avg orders per user
            });

            // For refill and coupon stats, would aggregate from orders
            setRefillStats({ total: 0, percentage: 0 });
            setCouponStats({ totalUsed: 0, totalDiscount: 0 });

        } catch (err) {
            console.error('Failed to load BI data:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Business Intelligence</h2>
                <button
                    onClick={loadBIData}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    title="Total Customers"
                    value={customerStats?.totalCustomers || 0}
                    icon="👥"
                    loading={loading}
                />
                <StatCard
                    title="Repeat Customers"
                    value={customerStats?.repeatCustomers || 0}
                    subtitle={`${customerStats?.totalCustomers ? Math.round((customerStats.repeatCustomers / customerStats.totalCustomers) * 100) : 0}% retention`}
                    icon="🔁"
                    loading={loading}
                />
                <StatCard
                    title="Refill Orders"
                    value={refillStats.total}
                    subtitle={`${refillStats.percentage}% of all orders`}
                    icon="🔄"
                    loading={loading}
                />
                <StatCard
                    title="Coupons Used"
                    value={couponStats.totalUsed}
                    subtitle={`${formatCurrency(couponStats.totalDiscount)} saved`}
                    icon="🎟️"
                    loading={loading}
                />
            </div>

            {/* Top Selling Products */}
            <div className="bg-background border border-border rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Top Selling Products</h3>
                {loading ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
                        ))}
                    </div>
                ) : topProducts.length === 0 ? (
                    <EmptyState
                        icon="📦"
                        title="No Sales Data"
                        description="No products have been ordered yet"
                    />
                ) : (
                    <div className="space-y-3">
                        {topProducts.map((product, index) => (
                            <div
                                key={product.id}
                                className="flex items-center justify-between p-4 bg-muted rounded-lg"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="font-semibold">{product.name}</p>
                                        <p className="text-sm text-foreground/60">{product.orderCount} orders</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-success">{formatCurrency(product.revenue)}</p>
                                    <p className="text-xs text-foreground/60">Revenue</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Customer Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-background border border-border rounded-lg p-6">
                    <h3 className="text-xl font-semibold mb-4">Customer Behavior</h3>
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-6 bg-muted rounded animate-pulse"></div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-foreground/70">Avg. Orders per Customer</span>
                                <span className="text-xl font-semibold">{customerStats?.averageOrders.toFixed(1) || '0.0'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground/70">First-Time Buyers</span>
                                <span className="text-xl font-semibold">
                                    {customerStats ? customerStats.totalCustomers - customerStats.repeatCustomers : 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground/70">Customer Lifetime Value</span>
                                <span className="text-xl font-semibold text-success">$0.00</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-background border border-border rounded-lg p-6">
                    <h3 className="text-xl font-semibold mb-4">Marketing Performance</h3>
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-6 bg-muted rounded animate-pulse"></div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-foreground/70">Coupons Redeemed</span>
                                <span className="text-xl font-semibold">{couponStats.totalUsed}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground/70">Total Discount Given</span>
                                <span className="text-xl font-semibold text-error">
                                    {formatCurrency(couponStats.totalDiscount)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground/70">Referral Conversions</span>
                                <span className="text-xl font-semibold">0</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
