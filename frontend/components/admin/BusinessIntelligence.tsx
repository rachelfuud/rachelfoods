'use client';

import React from 'react';
import { StatCard, EmptyState } from './StatCard';
import { useTopProducts, useCustomerRetention } from '@/lib/hooks/useAdmin';
import { formatCurrency } from '@/lib/utils';

export function BusinessIntelligence() {
    // React Query hooks with automatic caching
    const { data: topProducts = [], isLoading: productsLoading } = useTopProducts(5, { retry: false });
    const { data: customerStats, isLoading: customerLoading } = useCustomerRetention({ retry: false });

    const loading = productsLoading || customerLoading;

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
                                <span className="text-xl font-semibold">{customerStats?.averageOrdersPerCustomer.toFixed(1) || '0.0'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground/70">First-Time Buyers</span>
                                <span className="text-xl font-semibold">
                                    {customerStats ? customerStats.totalCustomers - customerStats.returningCustomers : 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground/70">Retention Rate</span>
                                <span className="text-xl font-semibold text-success">{customerStats?.retentionRate.toFixed(1) || '0'}%</span>
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
                                <span className="text-xl font-semibold">0</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground/70">Total Discount Given</span>
                                <span className="text-xl font-semibold text-error">
                                    {formatCurrency(0)}
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
