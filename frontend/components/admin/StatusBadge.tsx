'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export function StatusBadge({ status }: { status: OrderStatus }) {
    const styles = {
        PENDING: 'bg-warning/10 text-warning border-warning/20',
        CONFIRMED: 'bg-info/10 text-info border-info/20',
        SHIPPED: 'bg-primary/10 text-primary border-primary/20',
        DELIVERED: 'bg-success/10 text-success border-success/20',
        CANCELLED: 'bg-error/10 text-error border-error/20',
    };

    const labels = {
        PENDING: '⏳ Pending',
        CONFIRMED: '✓ Confirmed',
        SHIPPED: '📦 Shipped',
        DELIVERED: '✅ Delivered',
        CANCELLED: '❌ Cancelled',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
                styles[status]
            )}
        >
            {labels[status]}
        </span>
    );
}

export function PaymentMethodBadge({ method }: { method?: string }) {
    if (!method) return null;

    const styles = {
        STRIPE: 'bg-purple-100 text-purple-800 border-purple-200',
        COD: 'bg-orange-100 text-orange-800 border-orange-200',
    };

    const labels = {
        STRIPE: '💳 Card',
        COD: '💵 Cash on Delivery',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center px-2 py-1 rounded text-xs font-medium border',
                styles[method as keyof typeof styles] || 'bg-gray-100 text-gray-800'
            )}
        >
            {labels[method as keyof typeof labels] || method}
        </span>
    );
}
