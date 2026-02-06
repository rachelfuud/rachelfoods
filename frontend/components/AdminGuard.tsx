'use client';

import { useAuth } from './AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user, isAdmin, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

    useEffect(() => {
        // Don't guard the admin login page itself
        if (pathname === '/admin/login') {
            setHasCheckedAuth(true);
            return;
        }

        // Wait for auth to finish loading before checking
        if (loading) return;

        // Mark that we've checked auth at least once
        if (!hasCheckedAuth) {
            setHasCheckedAuth(true);
        }

        // Only redirect if we've checked auth and user is not authenticated
        if (!user) {
            console.log('AdminGuard: No user found, redirecting to login');
            router.push(`/admin/login?returnUrl=${encodeURIComponent(pathname)}`);
        } else if (!isAdmin) {
            console.log('AdminGuard: User is not admin, redirecting to home');
            router.push('/');
        }
    }, [user, isAdmin, loading, router, pathname, hasCheckedAuth]);

    // Allow access to login page without authentication
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    // Show loading state while checking authentication
    if (loading || !hasCheckedAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-foreground/70">Verifying access...</p>
                </div>
            </div>
        );
    }

    // Show access denied if user is not authenticated or not admin
    if (!user || !isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                    <p className="text-foreground/70">Admin access required</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
