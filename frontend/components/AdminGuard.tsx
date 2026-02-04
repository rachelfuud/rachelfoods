'use client';

import { useAuth } from './AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user, isAdmin } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Don't guard the admin login page itself
        if (pathname === '/admin/login') {
            return;
        }

        if (!user) {
            // Redirect to admin login page instead of regular login
            router.push(`/admin/login?returnUrl=${encodeURIComponent(pathname)}`);
        } else if (!isAdmin) {
            router.push('/');
        }
    }, [user, isAdmin, router, pathname]);

    // Allow access to login page without authentication
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

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
