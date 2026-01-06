'use client';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export default function OrderConfirmationPage({
    params,
}: {
    params: { orderId: string };
}) {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-16">
                <div className="max-w-2xl mx-auto text-center">
                    <div className="text-8xl mb-6">✅</div>

                    <h1 className="text-4xl font-bold mb-4">Order Placed Successfully!</h1>

                    <p className="text-xl text-foreground/70 mb-2">
                        Order Number: <span className="font-bold text-primary">{params.orderId}</span>
                    </p>

                    <div className="bg-accent/10 border border-accent/30 rounded-lg p-6 mb-8 mt-8">
                        <h2 className="font-semibold text-lg mb-2">⏳ Awaiting Seller Confirmation</h2>
                        <p className="text-sm text-foreground/70">
                            Your order has been sent to the seller for review. You'll receive a notification
                            once they confirm availability and pricing. Payment will be processed after confirmation.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <Link
                            href="/orders"
                            className="block py-3 px-6 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                        >
                            View All Orders
                        </Link>

                        <Link
                            href="/catalog"
                            className="block py-3 px-6 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary/5 transition-colors"
                        >
                            Continue Shopping
                        </Link>
                    </div>

                    <div className="mt-12 p-6 bg-muted rounded-lg text-left">
                        <h3 className="font-semibold mb-3">📧 What's Next?</h3>
                        <ul className="space-y-2 text-sm text-foreground/70">
                            <li>1. Seller reviews your order (usually within 1-2 hours)</li>
                            <li>2. You receive a confirmation email with final pricing</li>
                            <li>3. Payment is processed securely</li>
                            <li>4. Your order is prepared and shipped</li>
                            <li>5. Track your delivery in real-time</li>
                        </ul>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
