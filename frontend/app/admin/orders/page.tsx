'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/currency';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Order {
    id: string;
    orderNumber: string;
    userId?: string;
    users?: { firstName?: string; lastName?: string; email?: string };
    status: string;
    paymentStatus?: string;
    totalCost?: number;
    totalAmount?: number;
    createdAt: string;
    order_items?: any[];
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchOrders();
    }, [page, filter]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await api.getAdminOrders({
                page,
                limit: 20,
                status: filter !== 'ALL' ? filter : undefined,
            });
            setOrders(data.data);
            setTotalPages(data.pagination.totalPages);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = filter === 'ALL'
        ? orders
        : orders.filter(o => o.status === filter);

    const statusColors: Record<string, string> = {
        PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
        PREPARING: 'bg-purple-50 text-purple-700 border-purple-200',
        READY: 'bg-green-50 text-green-700 border-green-200',
        DELIVERED: 'bg-gray-50 text-gray-700 border-gray-200',
        CANCELLED: 'bg-red-50 text-red-700 border-red-200',
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold mb-2">Orders Management</h1>
                    <p className="text-foreground/70">View and manage customer orders</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-background border border-border rounded-lg p-4 mb-6">
                <div className="flex flex-wrap gap-2">
                    {['ALL', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg border transition-colors ${filter === status
                                ? 'bg-primary text-white border-primary'
                                : 'border-border hover:border-primary'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-foreground/70">Loading orders...</p>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="bg-background border border-border rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4">📦</div>
                    <h3 className="text-2xl font-bold mb-2">No orders found</h3>
                    <p className="text-foreground/70">
                        {filter === 'ALL' ? 'No orders yet' : `No ${filter} orders`}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredOrders.map((order) => (
                        <div
                            key={order.id}
                            className="bg-background border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg mb-1">
                                        Order #{order.orderNumber}
                                    </h3>
                                    <p className="text-sm text-foreground/70">
                                        {order.users?.firstName || ''} {order.users?.lastName || ''} ({order.users?.email || 'N/A'})
                                    </p>
                                    <p className="text-sm text-foreground/70">
                                        {new Date(order.createdAt).toLocaleString()}
                                    </p>
                                </div>

                                <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${statusColors[order.status]}`}>
                                    {order.status}
                                </span>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-border">
                                <div>
                                    <span className="text-2xl font-bold text-primary">
                                        {formatCurrency(order.totalCost || order.totalAmount || 0)}
                                    </span>
                                    <span className="text-sm text-foreground/70 ml-2">
                                        {order.order_items?.length || 0} item(s)
                                    </span>
                                </div>

                                <Link
                                    href={`/admin/orders/${order.id}`}
                                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    View Details
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && !loading && (
                <div className="flex justify-center gap-2 mt-6">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 border border-border rounded-md disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 border border-border rounded-md disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
