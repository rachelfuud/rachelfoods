'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PaymentIcons } from '@/components/PaymentIcons';
import { formatCurrency } from '@/lib/currency';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        zipCode: '',
        notes: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // TODO: Create order with backend API
        console.log('Creating order:', formData);

        // Simulate order creation
        const orderId = 'ORD-' + Date.now();
        localStorage.removeItem('cart');
        router.push(`/orders/${orderId}/confirmation`);
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold mb-8">Checkout</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Checkout Form */}
                    <div className="lg:col-span-2">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="border border-border rounded-lg p-6 bg-background">
                                <h2 className="text-2xl font-bold mb-4">Delivery Information</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="fullName" className="block text-sm font-medium mb-2">
                                            Full Name *
                                        </label>
                                        <input
                                            id="fullName"
                                            type="text"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium mb-2">
                                            Email *
                                        </label>
                                        <input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                            required
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label htmlFor="phone" className="block text-sm font-medium mb-2">
                                            Phone Number *
                                        </label>
                                        <input
                                            id="phone"
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                            required
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label htmlFor="address" className="block text-sm font-medium mb-2">
                                            Delivery Address *
                                        </label>
                                        <input
                                            id="address"
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="city" className="block text-sm font-medium mb-2">
                                            City *
                                        </label>
                                        <input
                                            id="city"
                                            type="text"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="zipCode" className="block text-sm font-medium mb-2">
                                            Zip Code *
                                        </label>
                                        <input
                                            id="zipCode"
                                            type="text"
                                            value={formData.zipCode}
                                            onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                                            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                            required
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label htmlFor="notes" className="block text-sm font-medium mb-2">
                                            Delivery Notes (Optional)
                                        </label>
                                        <textarea
                                            id="notes"
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            rows={3}
                                            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                            placeholder="Any special instructions for delivery..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border border-primary/20 rounded-lg p-6 bg-primary/5">
                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                    <span>ℹ️</span> Seller Confirmation Required
                                </h3>
                                <p className="text-sm text-foreground/70">
                                    Your order will be reviewed and confirmed by the seller before payment is processed.
                                    You'll receive a notification once the seller confirms availability and pricing.
                                </p>
                            </div>
                        </form>
                    </div>

                    {/* Order Summary */}
                    <div>
                        <div className="border border-border rounded-lg p-6 bg-background sticky top-24">
                            <h2 className="text-2xl font-bold mb-4">Order Summary</h2>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between">
                                    <span className="text-foreground/70">Subtotal</span>
                                    <span className="font-semibold">{formatCurrency(0)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-foreground/70">Tax</span>
                                    <span className="font-semibold">{formatCurrency(0)}</span>
                                </div>
                                <div className="border-t border-border pt-3 flex justify-between text-lg">
                                    <span className="font-bold">Total</span>
                                    <span className="font-bold text-primary">{formatCurrency(0)}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                            >
                                Place Order
                            </button>

                            <p className="text-xs text-foreground/60 mt-4 text-center">
                                Payment will be processed after seller confirmation
                            </p>

                            <div className="mt-6 pt-6 border-t border-border">
                                <PaymentIcons />
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
