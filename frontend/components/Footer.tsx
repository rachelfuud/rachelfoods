'use client';

import Link from 'next/link';
import { PaymentIcons } from './PaymentIcons';
import { useAuth } from './AuthProvider';

export function Footer() {
    const { user } = useAuth();
    return (
        <footer className="border-t border-border bg-muted mt-auto">
            {/* Why Choose RachelFoods Section */}
            <div className="bg-background border-b border-border">
                <div className="container mx-auto px-4 py-12 mb-8">
                    <h2 className="text-3xl font-bold text-center mb-10">Why Choose RachelFoods?</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="text-4xl mb-3">✅</div>
                            <h3 className="text-xl font-bold mb-3 text-primary">Seller Confirmed</h3>
                            <p className="text-foreground/70 text-sm">
                                Every order is reviewed and confirmed by the seller before payment.
                                No surprises, guaranteed availability.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="text-4xl mb-3">🌾</div>
                            <h3 className="text-xl font-bold mb-3 text-secondary">Authentic Quality</h3>
                            <p className="text-foreground/70 text-sm">
                                Traditional products sourced from trusted suppliers.
                                Fresh, authentic, and true to taste.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="text-4xl mb-3">🚚</div>
                            <h3 className="text-xl font-bold mb-3 text-accent">Fast Delivery</h3>
                            <p className="text-foreground/70 text-sm">
                                Professional delivery ensures your food arrives fresh and on time.
                                Track your order every step of the way.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Links */}
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="font-bold text-lg mb-4 text-primary">RachelFoods</h3>
                        <p className="text-sm text-foreground/70">
                            Human-assisted food commerce platform with seller confirmation workflow
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Shop</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/catalog" className="hover:text-primary transition-colors">All Products</Link></li>
                            <li><Link href="/catalog?featured=true" className="hover:text-primary transition-colors">Featured</Link></li>
                        </ul>
                    </div>

                    {user && (
                        <div>
                            <h4 className="font-semibold mb-4">Account</h4>
                            <ul className="space-y-2 text-sm">
                                <li><Link href="/orders" className="hover:text-primary transition-colors">My Orders</Link></li>
                                <li><Link href="/profile" className="hover:text-primary transition-colors">Profile</Link></li>
                            </ul>
                        </div>
                    )}

                    <div>
                        <h4 className="font-semibold mb-4">Support</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/help" className="hover:text-primary transition-colors">Help Center</Link></li>
                            <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-border">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <PaymentIcons />
                        <p className="text-sm text-foreground/60">&copy; 2026 RachelFoods. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
