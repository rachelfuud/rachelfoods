'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { GuestGuard } from '@/components/GuestGuard';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/';
    const { login: authLogin } = useAuth();
    const { showToast } = useToast();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                // Login using AuthProvider (updates state immediately)
                await authLogin(email, password);

                showToast(`Welcome back! You're now logged in.`, 'success');

                // Small delay to show the success state before redirect
                setTimeout(() => {
                    router.push(returnUrl);
                }, 500);
            } else {
                // Register
                const response = await api.register({
                    email,
                    password,
                    fullName,
                });

                // Store token in localStorage
                if (response.accessToken) {
                    localStorage.setItem('token', response.accessToken);
                    localStorage.setItem('user', JSON.stringify(response.user));
                }

                showToast('Account created successfully! Welcome to RachelFoods!', 'success');

                // Small delay to show success
                setTimeout(() => {
                    router.push(returnUrl);
                }, 500);
            }
        } catch (err: any) {
            console.error('Authentication error:', err);
            const errorMessage = err.message || 'Authentication failed. Please try again.';
            setError(errorMessage);
            showToast(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <GuestGuard>
            <div className="min-h-screen flex flex-col">
                <Header />

                <main className="flex-1 container mx-auto px-4 py-16">
                    <div className="max-w-md mx-auto">
                        <div className="bg-background border border-border rounded-lg p-8">
                            <h1 className="text-3xl font-bold mb-6 text-center">
                                {isLogin ? 'Welcome Back' : 'Create Account'}
                            </h1>

                            {returnUrl === '/checkout' && (
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
                                    Please log in or create an account to complete your checkout.
                                </div>
                            )}

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {!isLogin && (
                                    <div>
                                        <label htmlFor="fullName" className="block text-sm font-medium mb-2">
                                            Full Name
                                        </label>
                                        <input
                                            id="fullName"
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                            required={!isLogin}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium mb-2">
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading && <LoadingSpinner size="sm" className="border-t-white border-b-white" />}
                                    {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                <button
                                    onClick={() => {
                                        setIsLogin(!isLogin);
                                        setError('');
                                    }}
                                    className="text-primary hover:underline text-sm"
                                >
                                    {isLogin
                                        ? "Don't have an account? Sign up"
                                        : 'Already have an account? Login'}
                                </button>
                            </div>
                        </div>
                    </div>
                </main>

                <Footer />
            </div>
        </GuestGuard>
    );
}
