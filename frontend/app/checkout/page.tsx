'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PaymentIcons } from '@/components/PaymentIcons';
import { formatCurrency } from '@/lib/currency';
import { useRouter } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import StripeCheckoutForm from '@/components/StripeCheckoutForm';
import { api } from '@/lib/api';

// Load Stripe with publishable key from environment
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

type PaymentMethod = 'PAYPAL' | 'STRIPE' | 'COD';

export default function CheckoutPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        countryCode: '+1', // Default to US
        address: '',
        city: '',
        zipCode: '',
        notes: '',
    });
    // Default to COD if neither Stripe nor PayPal is configured
    const getDefaultPaymentMethod = (): PaymentMethod => {
        if (paypalClientId) return 'PAYPAL';
        if (stripePublishableKey) return 'STRIPE';
        return 'COD';
    };
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(getDefaultPaymentMethod());
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    // Check if user is logged in
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            // Redirect to login with return URL
            router.push('/login?returnUrl=/checkout');
        } else {
            setIsAuthenticated(true);
            setCheckingAuth(false);
        }
    }, [router]);

    // Show loading state while checking authentication
    if (checkingAuth || !isAuthenticated) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 container mx-auto px-4 py-8">
                    <div className="text-center">
                        <p className="text-lg">Checking authentication...</p>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Create order on backend
            const fullPhoneNumber = `${formData.countryCode}${formData.phone}`;
            const orderData = {
                deliveryAddress: formData.address,
                deliveryCity: formData.city,
                deliveryZipCode: formData.zipCode,
                deliveryPhone: fullPhoneNumber,
                deliveryNotes: formData.notes,
                paymentMethod: paymentMethod === 'COD' ? 'COD' : 'PREPAID',
                items: JSON.parse(localStorage.getItem('cart') || '[]'), // Cart items from localStorage
            };

            // Call your order creation API
            const order = await api.createOrder(orderData as any);
            setOrderId(order.id);

            if (paymentMethod === 'STRIPE') {
                // 2. Create Stripe PaymentIntent
                const paymentIntentData = await api.createPaymentIntent({ orderId: order.id });
                setClientSecret(paymentIntentData.clientSecret);
            } else if (paymentMethod === 'PAYPAL') {
                // PayPal: Order created, PayPal button will handle payment
                setLoading(false);
            } else {
                // COD: Mark as awaiting confirmation and redirect
                await api.confirmCODOrder({ orderId: order.id });
                localStorage.removeItem('cart');
                router.push(`/orders/${order.id}/confirmation`);
            }
        } catch (err: any) {
            console.error('Order creation failed:', err);
            setError(err.message || 'Failed to create order. Please try again.');
        } finally {
            if (paymentMethod !== 'PAYPAL') {
                setLoading(false);
            }
        }
    };

    const handlePaymentSuccess = () => {
        // Payment succeeded - clear cart and redirect
        localStorage.removeItem('cart');
        if (orderId) {
            router.push(`/orders/${orderId}/confirmation`);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold mb-8">Checkout</h1>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Checkout Form */}
                    <div className="lg:col-span-2">
                        <form onSubmit={handleCreateOrder} className="space-y-6">
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
                                            disabled={loading || !!clientSecret}
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
                                            disabled={loading || !!clientSecret}
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label htmlFor="phone" className="block text-sm font-medium mb-2">
                                            Phone Number *
                                        </label>
                                        <div className="flex gap-2">
                                            <select
                                                value={formData.countryCode}
                                                onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                                                className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                                disabled={loading || !!clientSecret}
                                            >
                                                <option value="+1">🇺🇸 +1 (US)</option>
                                                <option value="+44">🇬🇧 +44 (UK)</option>
                                                <option value="+234">🇳🇬 +234 (Nigeria)</option>
                                                <option value="+91">🇮🇳 +91 (India)</option>
                                                <option value="+86">🇨🇳 +86 (China)</option>
                                                <option value="+81">🇯🇵 +81 (Japan)</option>
                                                <option value="+49">🇩🇪 +49 (Germany)</option>
                                                <option value="+33">🇫🇷 +33 (France)</option>
                                                <option value="+61">🇦🇺 +61 (Australia)</option>
                                                <option value="+971">🇦🇪 +971 (UAE)</option>
                                            </select>
                                            <input
                                                id="phone"
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => {
                                                    // Remove non-numeric characters
                                                    const cleaned = e.target.value.replace(/\D/g, '');
                                                    setFormData({ ...formData, phone: cleaned });
                                                }}
                                                placeholder="8012345678"
                                                className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                                required
                                                disabled={loading || !!clientSecret}
                                            />
                                        </div>
                                        <p className="text-xs text-text-secondary mt-1">
                                            Enter your phone number without the country code
                                        </p>
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
                                            disabled={loading || !!clientSecret}
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
                                            disabled={loading || !!clientSecret}
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
                                            disabled={loading || !!clientSecret}
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
                                            disabled={loading || !!clientSecret}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method Selection */}
                            {!clientSecret && (
                                <div className="border border-border rounded-lg p-6 bg-background">
                                    <h2 className="text-2xl font-bold mb-4">Payment Method</h2>

                                    <div className="space-y-3">
                                        {/* PayPal - Only show if client ID is configured */}
                                        {paypalClientId && (
                                            <label className="flex items-start gap-3 p-4 border-2 border-primary rounded-lg cursor-pointer bg-primary/5">
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="PAYPAL"
                                                    checked={paymentMethod === 'PAYPAL'}
                                                    onChange={() => setPaymentMethod('PAYPAL')}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-semibold mb-1">
                                                        PayPal <span className="text-xs bg-primary text-white px-2 py-0.5 rounded ml-2">RECOMMENDED</span>
                                                    </div>
                                                    <p className="text-sm text-foreground/70">
                                                        Fast, secure payment via PayPal. Instant order confirmation.
                                                    </p>
                                                    <div className="mt-2">
                                                        <svg className="h-6" viewBox="0 0 124 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M46.211 6.749h-6.839a.95.95 0 0 0-.939.802l-2.766 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.972-1.142-2.696-1.746-4.985-1.746z" fill="#003087" />
                                                            <path d="M47.138 13.097c-.375 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.481h.473c1.235 0 2.4 0 3.002.704.359.42.468 1.044.332 1.906z" fill="#003087" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </label>
                                        )}

                                        <label className="flex items-start gap-3 p-4 border-2 border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="COD"
                                                checked={paymentMethod === 'COD'}
                                                onChange={() => setPaymentMethod('COD')}
                                                className="mt-1"
                                            />
                                            <div className="flex-1">
                                                <div className="font-semibold mb-1">
                                                    Cash on Delivery (COD)
                                                    {!paypalClientId && !stripePublishableKey && (
                                                        <span className="text-xs bg-primary text-white px-2 py-0.5 rounded ml-2">ONLY OPTION</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-foreground/70">
                                                    Pay when you receive your order. Order will be confirmed by seller first.
                                                </p>
                                            </div>
                                        </label>

                                        {/* Stripe - Only show if publishable key is configured */}
                                        {stripePublishableKey && (
                                            <label className="flex items-start gap-3 p-4 border-2 border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="STRIPE"
                                                    checked={paymentMethod === 'STRIPE'}
                                                    onChange={() => setPaymentMethod('STRIPE')}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-semibold mb-1">Pay Now (Credit/Debit Card)</div>
                                                    <p className="text-sm text-foreground/70">
                                                        Secure payment via Stripe. Your order will be confirmed instantly.
                                                    </p>
                                                    <div className="mt-2">
                                                        <PaymentIcons />
                                                    </div>
                                                </div>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Stripe Payment Form */}
                            {clientSecret && paymentMethod === 'STRIPE' && stripePromise && (
                                <div className="border border-primary/20 rounded-lg p-6 bg-primary/5">
                                    <h2 className="text-2xl font-bold mb-4">Complete Payment</h2>
                                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                                        <StripeCheckoutForm
                                            clientSecret={clientSecret}
                                            onSuccess={handlePaymentSuccess}
                                        />
                                    </Elements>
                                </div>
                            )}

                            {/* PayPal Button */}
                            {orderId && paymentMethod === 'PAYPAL' && paypalClientId && (
                                <div className="border border-primary/20 rounded-lg p-6 bg-primary/5">
                                    <h2 className="text-2xl font-bold mb-4">Complete Payment with PayPal</h2>
                                    <PayPalScriptProvider
                                        options={{
                                            clientId: paypalClientId,
                                            currency: 'USD',
                                        }}
                                    >
                                        <PayPalButtons
                                            createOrder={async () => {
                                                const response = await api.post('/api/payments/paypal/create-order', {
                                                    orderId,
                                                });
                                                return response.paypalOrderId;
                                            }}
                                            onApprove={async (data) => {
                                                await api.post(`/api/payments/paypal/capture/${data.orderID}`, {});
                                                localStorage.removeItem('cart');
                                                router.push(`/orders/${orderId}/confirmation`);
                                            }}
                                            onError={(err) => {
                                                console.error('PayPal error:', err);
                                                setError('PayPal payment failed. Please try again.');
                                            }}
                                            style={{
                                                layout: 'vertical',
                                                color: 'gold',
                                                shape: 'rect',
                                                label: 'paypal',
                                            }}
                                        />
                                    </PayPalScriptProvider>
                                </div>
                            )}

                            {!clientSecret && !orderId && (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' :
                                        paymentMethod === 'COD' ? 'Place Order (COD)' :
                                            paymentMethod === 'PAYPAL' ? 'Continue to PayPal' :
                                                'Continue to Payment'}
                                </button>
                            )}
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
                                    <span className="text-foreground/70">Shipping</span>
                                    <span className="font-semibold">{formatCurrency(0)}</span>
                                </div>
                                <div className="border-t border-border pt-3 flex justify-between text-lg">
                                    <span className="font-bold">Total</span>
                                    <span className="font-bold text-primary">{formatCurrency(0)}</span>
                                </div>
                            </div>

                            {paymentMethod === 'PAYPAL' && (
                                <div className="text-sm text-foreground/70 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <strong>PayPal:</strong> Fast and secure payment. Your order will be confirmed instantly.
                                </div>
                            )}

                            {paymentMethod === 'COD' && (
                                <div className="text-sm text-foreground/70 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <strong>Note:</strong> Your order will be reviewed by the seller before confirmation.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
