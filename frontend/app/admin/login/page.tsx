'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function AdminLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/admin';
    const { login: authLogin, isAdmin } = useAuth();
    const { showToast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Login using AuthProvider
            const response = await authLogin(email, password);

            // Check if user has admin role
            const user = response?.user || JSON.parse(localStorage.getItem('user') || '{}');
            const userRoles = user?.roles || [];
            const hasAdminRole = userRoles.some((role: any) =>
                ['ADMIN', 'STAFF', 'Platform Admin', 'Platform Staff'].includes(role.role?.name || role.name)
            );

            if (!hasAdminRole) {
                // Not an admin - log them out and show error
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setError('Access denied. Admin credentials required.');
                showToast('Access denied. This login is for administrators only.', 'error');
                setLoading(false);
                return;
            }

            showToast(`Welcome back, Admin!`, 'success');

            // Small delay to show the success state before redirect
            setTimeout(() => {
                // Use window.location for reliable navigation to admin dashboard
                window.location.href = returnUrl;
            }, 500);
        } catch (err: any) {
            console.error('Admin authentication error:', err);
            const errorMessage = err.message || 'Authentication failed. Please check your credentials.';
            setError(errorMessage);
            showToast(errorMessage, 'error');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary/5 via-background to-secondary/5 px-4">
            <div className="w-full max-w-md">
                <div className="bg-background border-2 border-border rounded-xl shadow-xl p-8">
                    {/* Admin Badge */}
                    <div className="flex justify-center mb-6">
                        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Admin Access
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold mb-2 text-center">
                        Admin Login
                    </h1>
                    <p className="text-center text-muted-foreground mb-8">
                        Sign in to access the control panel
                    </p>

                    {error && (
                        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-start gap-3">
                            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-2">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                placeholder="admin@rachelfoods.com"
                                disabled={loading}
                                autoComplete="email"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                placeholder="••••••••"
                                disabled={loading}
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <LoadingSpinner size="sm" />
                                    <span>Signing In...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                    <span>Sign In</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-border">
                        <div className="text-center space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Need admin access?
                            </p>
                            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Contact your system administrator</span>
                            </div>
                            <div className="pt-2">
                                <Link
                                    href="/"
                                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Back to Main Site
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Development Credentials Hint (remove in production) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs">
                        <div className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                            🔧 Development Mode
                        </div>
                        <div className="text-yellow-700 dark:text-yellow-300 space-y-1">
                            <div>Email: <code className="bg-yellow-100 dark:bg-yellow-900 px-1 py-0.5 rounded">admin@rachelfoods.com</code></div>
                            <div>Password: <code className="bg-yellow-100 dark:bg-yellow-900 px-1 py-0.5 rounded">Admin@123</code></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
