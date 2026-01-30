'use client';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export default function HelpPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold mb-8">Help Center</h1>

                    <div className="space-y-8">
                        {/* Ordering & Payment */}
                        <section className="border border-border rounded-lg p-6 bg-background">
                            <h2 className="text-2xl font-semibold mb-4">Ordering & Payment</h2>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-medium text-lg mb-2">How do I place an order?</h3>
                                    <p className="text-foreground/70">
                                        Browse our product catalog, add items to your cart, and proceed to checkout. You'll need to create an account or log in before completing your purchase.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-medium text-lg mb-2">What payment methods are accepted?</h3>
                                    <p className="text-foreground/70">
                                        We accept PayPal, credit/debit cards via Stripe, and Cash on Delivery (COD). All payments are processed securely.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-medium text-lg mb-2">Is my payment information secure?</h3>
                                    <p className="text-foreground/70">
                                        Yes! We use industry-standard encryption and work with trusted payment providers (Stripe and PayPal). We never store your full credit card details on our servers.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Delivery & Shipping */}
                        <section className="border border-border rounded-lg p-6 bg-background">
                            <h2 className="text-2xl font-semibold mb-4">Delivery & Shipping</h2>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-medium text-lg mb-2">How long does delivery take?</h3>
                                    <p className="text-foreground/70">
                                        Delivery times vary by location. Once your order is confirmed by the seller, you'll receive estimated delivery dates via email. Typically, orders are delivered within 3-7 business days.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-medium text-lg mb-2">Can I track my order?</h3>
                                    <p className="text-foreground/70">
                                        Yes! Visit your <Link href="/orders" className="text-primary hover:underline">Orders page</Link> to track the status of your deliveries.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-medium text-lg mb-2">Do you ship internationally?</h3>
                                    <p className="text-foreground/70">
                                        Currently, we ship to select countries. Shipping availability is shown at checkout based on your delivery address.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Returns & Refunds */}
                        <section className="border border-border rounded-lg p-6 bg-background">
                            <h2 className="text-2xl font-semibold mb-4">Returns & Refunds</h2>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-medium text-lg mb-2">What is your return policy?</h3>
                                    <p className="text-foreground/70">
                                        We accept returns within 14 days of delivery for non-perishable items. Food products must be unopened and in original packaging. Contact support to initiate a return.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-medium text-lg mb-2">How do I request a refund?</h3>
                                    <p className="text-foreground/70">
                                        Refunds are processed automatically for approved returns or cancellations. Funds are credited to your wallet, which you can use for future purchases or withdraw.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-medium text-lg mb-2">What if my order arrives damaged?</h3>
                                    <p className="text-foreground/70">
                                        Please contact our support team within 48 hours of delivery with photos of the damaged items. We'll arrange a replacement or full refund.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Account & Support */}
                        <section className="border border-border rounded-lg p-6 bg-background">
                            <h2 className="text-2xl font-semibold mb-4">Account & Support</h2>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-medium text-lg mb-2">How do I reset my password?</h3>
                                    <p className="text-foreground/70">
                                        Click "Forgot Password" on the <Link href="/login" className="text-primary hover:underline">login page</Link>. Enter your email address, and we'll send you a password reset link.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-medium text-lg mb-2">How do I update my account information?</h3>
                                    <p className="text-foreground/70">
                                        Log in and visit your <Link href="/profile" className="text-primary hover:underline">Profile page</Link> to update your email, phone number, or delivery addresses.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-medium text-lg mb-2">How do I contact customer support?</h3>
                                    <p className="text-foreground/70">
                                        Email us at <a href="mailto:support@rachelfoods.com" className="text-primary hover:underline">support@rachelfoods.com</a> or use the contact form on our <Link href="/contact" className="text-primary hover:underline">Contact page</Link>. We typically respond within 24 hours.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Still Need Help? */}
                        <section className="border border-primary/20 rounded-lg p-6 bg-primary/5">
                            <h2 className="text-2xl font-semibold mb-4">Still Need Help?</h2>
                            <p className="text-foreground/80 mb-4">
                                Can't find what you're looking for? Our support team is here to help!
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <Link
                                    href="/contact"
                                    className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    Contact Support
                                </Link>
                                <Link
                                    href="/orders"
                                    className="inline-block px-6 py-3 border-2 border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors"
                                >
                                    View My Orders
                                </Link>
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
