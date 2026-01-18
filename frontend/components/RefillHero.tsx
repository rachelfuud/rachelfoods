'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function RefillHero() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    return (
        <section className="py-20 bg-gradient-to-br from-brand-accent/10 via-accent-50 to-brand-highlight/30 dark:from-accent-900/20 dark:via-accent-800/10 dark:to-accent-900/20">
            <div className="container mx-auto px-4">
                <div
                    className={`max-w-4xl mx-auto bg-brand-surface dark:bg-surface-elevated rounded-3xl shadow-2xl overflow-hidden transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                        }`}
                >
                    <div className="relative">
                        {/* Accent gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-accent-500/20 to-secondary-500/20 dark:from-accent-600/10 dark:to-secondary-600/10"></div>

                        <div className="relative p-12 text-center">
                            {/* Icon with animated pulse */}
                            <div className="mb-6 inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 dark:from-accent-500 dark:to-accent-700 shadow-lg animate-pulse">
                                <span className="text-5xl">🔄</span>
                            </div>

                            {/* Headline */}
                            <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-accent-600 via-secondary-600 to-primary-600 dark:from-accent-400 dark:via-secondary-400 dark:to-primary-400 bg-clip-text text-transparent">
                                Refill Your Kitchen
                            </h2>

                            {/* Subtitle */}
                            <p className="text-xl md:text-2xl text-text-secondary dark:text-text-secondary mb-8 max-w-2xl mx-auto leading-relaxed">
                                Never run out of your essentials. Instantly reorder your favorite ingredients
                                with one click — saving you time and keeping your pantry stocked.
                            </p>

                            {/* Benefits Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 max-w-3xl mx-auto">
                                <div className="bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/30 dark:to-accent-800/20 p-6 rounded-2xl border border-accent-200 dark:border-accent-700">
                                    <div className="text-4xl mb-3">⚡</div>
                                    <h3 className="font-bold text-lg mb-2 text-foreground">Lightning Fast</h3>
                                    <p className="text-sm text-text-secondary">One-click reordering</p>
                                </div>
                                <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 dark:from-secondary-900/30 dark:to-secondary-800/20 p-6 rounded-2xl border border-secondary-200 dark:border-secondary-700">
                                    <div className="text-4xl mb-3">💾</div>
                                    <h3 className="font-bold text-lg mb-2 text-foreground">Order History</h3>
                                    <p className="text-sm text-text-secondary">Track all purchases</p>
                                </div>
                                <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 p-6 rounded-2xl border border-primary-200 dark:border-primary-700">
                                    <div className="text-4xl mb-3">🎯</div>
                                    <h3 className="font-bold text-lg mb-2 text-foreground">Smart Reminders</h3>
                                    <p className="text-sm text-text-secondary">Never forget items</p>
                                </div>
                            </div>

                            {/* CTA Button */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <Link
                                    href="/catalog?refill=true"
                                    className="group relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-accent-500 to-accent-600 dark:from-accent-600 dark:to-accent-700 text-white text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden"
                                >
                                    <span className="absolute inset-0 bg-gradient-to-r from-accent-600 to-accent-700 dark:from-accent-700 dark:to-accent-800 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                                    <span className="relative flex items-center gap-3">
                                        <span className="text-2xl">🔄</span>
                                        <span>Start Refilling Now</span>
                                        <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </span>
                                </Link>

                                <Link
                                    href="/orders"
                                    className="inline-flex items-center gap-2 px-8 py-4 bg-transparent border-2 border-accent-500 dark:border-accent-600 text-accent-600 dark:text-accent-400 font-semibold rounded-2xl hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-all duration-300"
                                >
                                    <span>View Order History</span>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
