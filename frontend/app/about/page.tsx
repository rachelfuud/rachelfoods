import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

// Enable ISR: Revalidate every hour (static content changes rarely)
// FREE optimization - instant page loads from cache
export const revalidate = 3600;

export default function AboutPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="bg-linear-to-br from-primary/10 via-secondary/10 to-accent/10 py-20">
                    <div className="container mx-auto px-4 text-center">
                        <h1 className="text-5xl font-bold mb-6">About RachelFoods</h1>
                        <p className="text-xl text-foreground/70 max-w-3xl mx-auto">
                            Your trusted source for authentic, fresh local foods delivered with care.
                        </p>
                    </div>
                </section>

                {/* Story Section */}
                <section className="py-20 bg-background">
                    <div className="container mx-auto px-4">
                        <div className="max-w-4xl mx-auto">
                            <h2 className="text-4xl font-bold mb-8">Our Story</h2>
                            <div className="prose prose-lg max-w-none text-foreground/80 space-y-4">
                                <p>
                                    RachelFoods was founded with a simple mission: to make authentic,
                                    high-quality food products accessible to everyone in the United States.
                                    We believe that great food starts with quality products and authentic recipes.
                                </p>
                                <p>
                                    What sets us apart is our unique seller confirmation workflow. Unlike
                                    traditional e-commerce, every order is reviewed and confirmed by our
                                    trusted sellers before payment is processed. This ensures you always
                                    get exactly what you need, when you need it.
                                </p>
                                <p>
                                    We partner with carefully selected suppliers who share our commitment
                                    to quality, freshness, and authenticity. From traditional grains and
                                    proteins to specialty spices and ready mixes, every product in our
                                    catalog meets our high standards.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Values Section */}
                <section className="py-20 bg-muted">
                    <div className="container mx-auto px-4">
                        <h2 className="text-4xl font-bold text-center mb-12">Our Values</h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            <div className="bg-background p-8 rounded-lg border border-border">
                                <div className="text-5xl mb-4">🎯</div>
                                <h3 className="text-2xl font-bold mb-4 text-primary">Quality First</h3>
                                <p className="text-foreground/70">
                                    We never compromise on quality. Every product is carefully sourced
                                    and inspected to meet our rigorous standards.
                                </p>
                            </div>

                            <div className="bg-background p-8 rounded-lg border border-border">
                                <div className="text-5xl mb-4">🤝</div>
                                <h3 className="text-2xl font-bold mb-4 text-secondary">Trust & Transparency</h3>
                                <p className="text-foreground/70">
                                    Our seller confirmation process ensures transparency at every step.
                                    You know exactly what you're getting before you pay.
                                </p>
                            </div>

                            <div className="bg-background p-8 rounded-lg border border-border">
                                <div className="text-5xl mb-4">💚</div>
                                <h3 className="text-2xl font-bold mb-4 text-accent">Customer Care</h3>
                                <p className="text-foreground/70">
                                    Your satisfaction is our priority. We're here to help with any
                                    questions or concerns, every step of the way.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section className="py-20 bg-background">
                    <div className="container mx-auto px-4">
                        <h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>

                        <div className="max-w-4xl mx-auto space-y-8">
                            <div className="flex gap-6">
                                <div className="shrink-0 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl">
                                    1
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-2">Browse & Order</h3>
                                    <p className="text-foreground/70">
                                        Explore our catalog and add products to your cart. Place your order
                                        with just a few clicks.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="shrink-0 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl">
                                    2
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-2">Seller Confirmation</h3>
                                    <p className="text-foreground/70">
                                        Our trusted sellers review your order to confirm availability,
                                        freshness, and pricing. You'll receive a notification once confirmed.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="shrink-0 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl">
                                    3
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-2">Secure Payment</h3>
                                    <p className="text-foreground/70">
                                        After seller confirmation, complete your payment securely through
                                        our trusted payment partners.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="shrink-0 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl">
                                    4
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-2">Fast Delivery</h3>
                                    <p className="text-foreground/70">
                                        Your order is carefully packed and delivered fresh to your door.
                                        Track your delivery every step of the way.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 bg-primary text-white">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-4xl font-bold mb-6">Ready to Experience the Difference?</h2>
                        <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
                            Join thousands of satisfied customers who trust RachelFoods for their
                            authentic food needs.
                        </p>
                        <Link
                            href="/catalog"
                            className="inline-block px-8 py-4 bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300 border-2 border-secondary-300 dark:border-secondary-700 rounded-lg font-semibold hover:bg-secondary-200 dark:hover:bg-secondary-800/40 transition-colors text-lg"
                        >
                            Start Shopping
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
