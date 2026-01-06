'use client';

import { useAuth } from './AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user, isAdmin } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!user) {
            router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        } else if (!isAdmin) {
            router.push('/');
        }
    }, [user, isAdmin, router, pathname]);

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
