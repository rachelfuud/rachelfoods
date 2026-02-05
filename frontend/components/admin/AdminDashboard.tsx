'use client';

import React from 'react';
import Link from 'next/link';
import { StatCard, SkeletonCard, EmptyState } from '@/components/admin/StatCard';
import { BusinessIntelligence } from '@/components/admin/BusinessIntelligence';
import { QuickActionCard, QuickActionsGrid } from '@/components/admin/QuickActionCard';
import { useSystemHealth, useOrderMetrics } from '@/lib/hooks/useAdmin';
import { formatCurrency } from '@/lib/utils';

export function AdminDashboard() {
    // React Query hooks - automatic caching and refetching
    const { data: health, isLoading: healthLoading, error: healthError } = useSystemHealth();
    const { data: orderMetrics, isLoading: metricsLoading, error: metricsError } = useOrderMetrics();

    const loading = healthLoading || metricsLoading;
    const error = healthError || metricsError;

    if (error) {
        return (
            <EmptyState
                icon="⚠️"
                title="Failed to Load Dashboard"
                description={error.message}
                action={
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
                    >
                        Retry
                    </button>
                }
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-foreground/60 mt-1">Overview of your business metrics</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                    disabled={loading}
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Quick Actions */}
            <QuickActionsGrid>
                <QuickActionCard
                    icon="📦"
                    title="New Product"
                    description="Add a product to catalog"
                    href="/admin/products?action=new"
                />
                <QuickActionCard
                    icon="📋"
                    title="Manage Orders"
                    description="View and process orders"
                    href="/admin/orders"
                    badge={health?.metrics.orders.pending ? String(health.metrics.orders.pending) : undefined}
                    badgeColor="warning"
                />
                <QuickActionCard
                    icon="🎯"
                    title="Hero Slides"
                    description="Update homepage banner"
                    href="/admin/hero-slides"
                />
                <QuickActionCard
                    icon="🎨"
                    title="Theme Settings"
                    description="Customize site appearance"
                    href="/admin/theme"
                />
            </QuickActionsGrid>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Orders Today"
                    value={health?.metrics.orders.today || 0}
                    subtitle={`${health?.metrics.orders.pending || 0} pending`}
                    icon="📦"
                    loading={loading}
                />
                <StatCard
                    title="Revenue Today"
                    value={orderMetrics?.today.totalValue ? formatCurrency(orderMetrics.today.totalValue) : '$0.00'}
                    subtitle={`Avg: ${orderMetrics?.averageOrderValue ? formatCurrency(orderMetrics.averageOrderValue) : '$0'}`}
                    icon="💰"
                    loading={loading}
                />
                <StatCard
                    title="Active Users"
                    value={health?.metrics.users.activeLast24h || 0}
                    subtitle="Last 24 hours"
                    icon="👥"
                    loading={loading}
                />
                <StatCard
                    title="Refunds Today"
                    value={health?.metrics.refunds.today || 0}
                    subtitle={`${health?.metrics.payments.failedToday || 0} failed payments`}
                    icon="↩️"
                    loading={loading}
                />
            </div>

            {/* Weekly Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-background border border-border rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">This Week</h2>
                    {loading ? (
                        <div className="space-y-3">
                            <div className="h-6 bg-muted rounded animate-pulse"></div>
                            <div className="h-6 bg-muted rounded animate-pulse"></div>
                            <div className="h-6 bg-muted rounded animate-pulse"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-foreground/70">Total Orders</span>
                                <span className="text-2xl font-bold">{orderMetrics?.thisWeek.count || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground/70">Total Revenue</span>
                                <span className="text-2xl font-bold text-success">
                                    {orderMetrics?.thisWeek.totalValue ? formatCurrency(orderMetrics.thisWeek.totalValue) : '$0.00'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground/70">Average Order</span>
                                <span className="text-xl font-semibold">
                                    {orderMetrics?.averageOrderValue ? formatCurrency(orderMetrics.averageOrderValue) : '$0.00'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-background border border-border rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">System Health</h2>
                    {loading ? (
                        <div className="space-y-3">
                            <div className="h-6 bg-muted rounded animate-pulse"></div>
                            <div className="h-6 bg-muted rounded animate-pulse"></div>
                            <div className="h-6 bg-muted rounded animate-pulse"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-foreground/70">Cache Entries</span>
                                <span className="text-lg font-semibold">
                                    {health?.metrics.cache.validEntries || 0} valid
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground/70">Pending Orders</span>
                                <span className="text-lg font-semibold text-warning">
                                    {health?.metrics.orders.pending || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground/70">Failed Payments Today</span>
                                <span className="text-lg font-semibold text-error">
                                    {health?.metrics.payments.failedToday || 0}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                    href="/admin/orders"
                    className="bg-primary/5 border border-primary/20 rounded-lg p-6 hover:bg-primary/10 transition-colors group"
                >
                    <div className="text-3xl mb-3">📋</div>
                    <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Manage Orders</h3>
                    <p className="text-sm text-foreground/60">
                        View and update order statuses
                    </p>
                </Link>

                <Link
                    href="/admin/products"
                    className="bg-secondary/5 border border-secondary/20 rounded-lg p-6 hover:bg-secondary/10 transition-colors group"
                >
                    <div className="text-3xl mb-3">📦</div>
                    <h3 className="font-semibold mb-1 group-hover:text-secondary transition-colors">Manage Products</h3>
                    <p className="text-sm text-foreground/60">
                        Add, edit, or disable products
                    </p>
                </Link>

                <Link
                    href="/admin/theme"
                    className="bg-accent/5 border border-accent/20 rounded-lg p-6 hover:bg-accent/10 transition-colors group"
                >
                    <div className="text-3xl mb-3">🎨</div>
                    <h3 className="font-semibold mb-1 group-hover:text-accent transition-colors">Theme Settings</h3>
                    <p className="text-sm text-foreground/60">
                        Customize site appearance
                    </p>
                </Link>
            </div>

            {/* Business Intelligence */}
            <BusinessIntelligence />
        </div>
    );
}
