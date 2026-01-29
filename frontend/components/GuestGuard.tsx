'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface GuestGuardProps {
    children: ReactNode;
    redirectTo?: string;
}

/**
 * GuestGuard - Protects routes that should only be accessible to unauthenticated users
 * Redirects authenticated users to the specified page or home
 * Used for login, register, and other guest-only pages
 */
export function GuestGuard({ children, redirectTo }: GuestGuardProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, token } = useAuth();
    const returnUrl = searchParams.get('returnUrl');

    useEffect(() => {
        // If user is already authenticated, redirect them away
        if (user && token) {
            // Priority: returnUrl > custom redirectTo > default home
            const destination = returnUrl || redirectTo || '/';

            // Use replace to prevent back button from returning to login
            router.replace(destination);
        }
    }, [user, token, router, returnUrl, redirectTo]);

    // Show loading spinner while checking authentication
    // This prevents flash of login form before redirect
    if (user && token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-foreground/60">Redirecting...</p>
                </div>
            </div>
        );
    }

    // User is not authenticated, show the page
    return <>{children}</>;
}
