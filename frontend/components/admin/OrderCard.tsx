'use client';

import React, { useState } from 'react';
import { StatusBadge, PaymentMethodBadge } from './StatusBadge';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

interface Order {
    id: string;
    orderNumber: string;
    userId?: string;
    users?: { firstName?: string; lastName?: string; email?: string };
    status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
    paymentMethod?: string;
    paymentStatus?: string;
    totalCost?: number;
    totalAmount?: number;
    walletUsed?: number;
    couponDiscount?: number;
    discountAmount?: number;
    createdAt: string;
    order_items?: any[];
}

interface OrderCardProps {
    order: Order;
    onStatusUpdate?: (orderId: string, newStatus: string) => void;
    onRefund?: (orderId: string) => void;
}

export function OrderCard({ order, onStatusUpdate, onRefund }: OrderCardProps) {
    const [showActions, setShowActions] = useState(false);
    const [updating, setUpdating] = useState(false);

    const handleStatusUpdate = async (newStatus: string) => {
        if (!onStatusUpdate) return;

        setUpdating(true);
        try {
            await onStatusUpdate(order.id, newStatus);
        } finally {
            setUpdating(false);
            setShowActions(false);
        }
    };

    const handleRefund = () => {
        if (!onRefund) return;
        if (confirm(`Are you sure you want to refund order #${order.orderNumber}?`)) {
            onRefund(order.id);
        }
    };

    const canChangeStatus = order.status !== 'DELIVERED' && order.status !== 'CANCELLED';
    const canRefund = order.status === 'DELIVERED' || order.status === 'CONFIRMED';

    return (
        <div className="bg-background border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">Order #{order.orderNumber}</h3>
                        <StatusBadge status={order.status} />
                    </div>
                    <p className="text-sm text-foreground/70 mb-1">
                        {order.users?.firstName || ''} {order.users?.lastName || ''}
                    </p>
                    <p className="text-xs text-foreground/60">{order.users?.email || 'N/A'}</p>
                    <p className="text-xs text-foreground/60 mt-1">
                        {new Date(order.createdAt).toLocaleString()}
                    </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <PaymentMethodBadge method={order.paymentMethod} />
                    <span className="text-xs text-foreground/60">
                        {order.paymentStatus}
                    </span>
                </div>
            </div>

            {/* Financial Details */}
            <div className="bg-muted rounded-lg p-4 mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-foreground/70">Order Total</span>
                    <span className="font-semibold">{formatCurrency(order.totalCost || order.totalAmount || 0)}</span>
                </div>
                {order.walletUsed && order.walletUsed > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-foreground/70">💰 Wallet Credit Used</span>
                        <span className="text-success font-medium">-{formatCurrency(order.walletUsed)}</span>
                    </div>
                )}
                {(order.couponDiscount || order.discountAmount) && (order.couponDiscount || order.discountAmount || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-foreground/70">🎟️ Coupon Discount</span>
                        <span className="text-success font-medium">-{formatCurrency(order.couponDiscount || order.discountAmount || 0)}</span>
                    </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t border-border">
                    <span className="font-semibold">Items</span>
                    <span>{order.order_items?.length || 0}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
                <Link
                    href={`/admin/orders/${order.id}`}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                >
                    📋 View Details
                </Link>

                {canChangeStatus && (
                    <button
                        onClick={() => setShowActions(!showActions)}
                        disabled={updating}
                        className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
                    >
                        {updating ? '⏳ Updating...' : '🔄 Change Status'}
                    </button>
                )}

                {canRefund && (
                    <button
                        onClick={handleRefund}
                        className="px-4 py-2 border border-error text-error rounded-lg hover:bg-error/10 transition-colors text-sm"
                    >
                        ↩️ Refund
                    </button>
                )}
            </div>

            {/* Status Update Menu */}
            {showActions && canChangeStatus && (
                <div className="mt-4 p-4 bg-muted rounded-lg border border-border space-y-2">
                    <p className="text-sm font-medium mb-2">Update order status:</p>
                    <div className="flex flex-wrap gap-2">
                        {order.status === 'PENDING' && (
                            <button
                                onClick={() => handleStatusUpdate('CONFIRMED')}
                                disabled={updating}
                                className="px-3 py-1.5 bg-info text-white rounded text-sm hover:opacity-90"
                            >
                                ✓ Confirm
                            </button>
                        )}
                        {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                            <>
                                <button
                                    onClick={() => handleStatusUpdate('SHIPPED')}
                                    disabled={updating}
                                    className="px-3 py-1.5 bg-primary text-white rounded text-sm hover:opacity-90"
                                >
                                    📦 Mark Shipped
                                </button>
                                <button
                                    onClick={() => handleStatusUpdate('CANCELLED')}
                                    disabled={updating}
                                    className="px-3 py-1.5 bg-error text-white rounded text-sm hover:opacity-90"
                                >
                                    ❌ Cancel
                                </button>
                            </>
                        )}
                        {order.status === 'SHIPPED' && (
                            <button
                                onClick={() => handleStatusUpdate('DELIVERED')}
                                disabled={updating}
                                className="px-3 py-1.5 bg-success text-white rounded text-sm hover:opacity-90"
                            >
                                ✅ Mark Delivered
                            </button>
                        )}
                        <button
                            onClick={() => setShowActions(false)}
                            className="px-3 py-1.5 border border-border rounded text-sm hover:bg-background"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
