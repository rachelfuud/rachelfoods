'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LoadingSpinner from '@/components/LoadingSpinner';

interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    variantName?: string;
    productPrice: number;
    quantity: number;
    subtotal: number;
    products?: {
        id: string;
        name: string;
        slug: string;
        imageUrl?: string;
    };
}

interface OrderDetail {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    subtotal: number;
    shippingCost: number;
    discountAmount: number;
    walletUsed: number;
    totalCost: number;
    deliveryAddress: string;
    deliveryCity: string;
    deliveryState?: string;
    deliveryZipCode?: string;
    deliveryPhone: string;
    deliveryNotes?: string;
    couponCode?: string;
    createdAt: string;
    confirmedAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    cancelledAt?: string;
    cancellationReason?: string;
    order_items?: OrderItem[];
    items?: OrderItem[];
    users?: {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
    };
}

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.orderId as string;

    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadOrderDetail();
    }, [orderId]);

    const loadOrderDetail = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                router.push('/login?redirect=/orders/' + orderId);
                return;
            }

            const data = await api.getOrder(token, orderId);
            setOrder(data);
        } catch (err: any) {
            console.error('Failed to load order:', err);
            setError(err.message || 'Failed to load order details');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'AWAITING_CONFIRMATION':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'CONFIRMED':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'PROCESSING':
                return 'bg-purple-100 text-purple-800 border-purple-300';
            case 'SHIPPED':
                return 'bg-indigo-100 text-indigo-800 border-indigo-300';
            case 'DELIVERED':
                return 'bg-teal-100 text-teal-800 border-teal-300';
            case 'COMPLETED':
                return 'bg-emerald-100 text-emerald-800 border-emerald-300';
            case 'CANCELLED':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'REFUNDED':
                return 'bg-orange-100 text-orange-800 border-orange-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'PAID':
                return 'bg-green-100 text-green-800';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800';
            case 'FAILED':
                return 'bg-red-100 text-red-800';
            case 'REFUNDED':
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <LoadingSpinner />
                </main>
                <Footer />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center bg-background">
                    <div className="text-center max-w-md mx-auto p-8">
                        <div className="text-6xl mb-4">❌</div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">Order Not Found</h1>
                        <p className="text-foreground/70 mb-6">{error || 'Unable to load order details'}</p>
                        <Link
                            href="/orders"
                            className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            Back to Orders
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const orderItems = order.order_items || order.items || [];

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-1 py-12">
                <div className="container mx-auto px-4 max-w-4xl">
                    {/* Back Button */}
                    <Link
                        href="/orders"
                        className="inline-flex items-center gap-2 text-primary hover:underline mb-6"
                    >
                        ← Back to Orders
                    </Link>

                    {/* Order Header */}
                    <div className="bg-card border border-border rounded-lg p-6 mb-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-foreground mb-2">
                                    Order #{order.orderNumber}
                                </h1>
                                <p className="text-sm text-foreground/70">
                                    Placed on {formatDate(order.createdAt)}
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <span className={`px-4 py-2 rounded-lg text-sm font-medium border text-center ${getStatusColor(order.status)}`}>
                                    {order.status}
                                </span>
                                <span className={`px-4 py-2 rounded-lg text-sm font-medium text-center ${getPaymentStatusColor(order.paymentStatus)}`}>
                                    Payment: {order.paymentStatus}
                                </span>
                            </div>
                        </div>

                        {/* Order Timeline */}
                        <div className="border-t border-border pt-4 mt-4">
                            <h3 className="font-semibold text-foreground mb-3">Order Timeline</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-foreground/70">Ordered:</span>
                                    <span className="text-foreground font-medium">{formatDate(order.createdAt)}</span>
                                </div>
                                {order.confirmedAt && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-foreground/70">Confirmed:</span>
                                        <span className="text-foreground font-medium">{formatDate(order.confirmedAt)}</span>
                                    </div>
                                )}
                                {order.shippedAt && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-foreground/70">Shipped:</span>
                                        <span className="text-foreground font-medium">{formatDate(order.shippedAt)}</span>
                                    </div>
                                )}
                                {order.deliveredAt && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-foreground/70">Delivered:</span>
                                        <span className="text-foreground font-medium">{formatDate(order.deliveredAt)}</span>
                                    </div>
                                )}
                                {order.cancelledAt && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-foreground/70">Cancelled:</span>
                                        <span className="text-foreground font-medium">{formatDate(order.cancelledAt)}</span>
                                        {order.cancellationReason && (
                                            <span className="text-red-600">({order.cancellationReason})</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="bg-card border border-border rounded-lg p-6 mb-6">
                        <h2 className="text-xl font-bold text-foreground mb-4">Order Items ({orderItems.length})</h2>
                        <div className="space-y-4">
                            {orderItems.map((item) => (
                                <div key={item.id} className="flex items-start gap-4 pb-4 border-b border-border last:border-b-0 last:pb-0">
                                    {item.products?.imageUrl && (
                                        <img
                                            src={item.products.imageUrl}
                                            alt={item.productName}
                                            className="w-20 h-20 object-cover rounded-lg border border-border"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-foreground">
                                            {item.productName}
                                            {item.variantName && (
                                                <span className="text-sm text-foreground/70 ml-2">({item.variantName})</span>
                                            )}
                                        </h3>
                                        <p className="text-sm text-foreground/70">
                                            {formatCurrency(item.productPrice)} × {item.quantity}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-foreground">
                                            {formatCurrency(item.subtotal)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Delivery Information */}
                    <div className="bg-card border border-border rounded-lg p-6 mb-6">
                        <h2 className="text-xl font-bold text-foreground mb-4">Delivery Information</h2>
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="text-foreground/70">Address:</span>
                                <p className="text-foreground font-medium">{order.deliveryAddress}</p>
                                <p className="text-foreground font-medium">
                                    {order.deliveryCity}
                                    {order.deliveryState && `, ${order.deliveryState}`}
                                    {order.deliveryZipCode && ` ${order.deliveryZipCode}`}
                                </p>
                            </div>
                            <div>
                                <span className="text-foreground/70">Phone:</span>
                                <span className="text-foreground font-medium ml-2">{order.deliveryPhone}</span>
                            </div>
                            {order.deliveryNotes && (
                                <div>
                                    <span className="text-foreground/70">Notes:</span>
                                    <p className="text-foreground font-medium">{order.deliveryNotes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h2 className="text-xl font-bold text-foreground mb-4">Payment Summary</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-foreground/70">Payment Method:</span>
                                <span className="text-foreground font-medium">{order.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-foreground/70">Subtotal:</span>
                                <span className="text-foreground">{formatCurrency(order.subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-foreground/70">Shipping:</span>
                                <span className="text-foreground">{formatCurrency(order.shippingCost)}</span>
                            </div>
                            {order.discountAmount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Discount {order.couponCode && `(${order.couponCode})`}:</span>
                                    <span>-{formatCurrency(order.discountAmount)}</span>
                                </div>
                            )}
                            {order.walletUsed > 0 && (
                                <div className="flex justify-between text-blue-600">
                                    <span>Wallet Credit:</span>
                                    <span>-{formatCurrency(order.walletUsed)}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-border">
                                <span className="text-foreground font-bold text-lg">Total:</span>
                                <span className="text-primary font-bold text-lg">{formatCurrency(order.totalCost)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex gap-4">
                        <Link
                            href="/orders"
                            className="flex-1 px-6 py-3 border border-primary text-primary text-center rounded-lg hover:bg-primary/5 transition-colors"
                        >
                            Back to Orders
                        </Link>
                        <Link
                            href="/contact"
                            className="flex-1 px-6 py-3 bg-primary text-white text-center rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            Contact Support
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
