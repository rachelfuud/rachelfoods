'use client';

import { AdminGuard } from '@/components/AdminGuard';
import { AdminNav } from '@/components/AdminNav';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Breadcrumbs } from '@/components/admin/Breadcrumbs';
import { AdminKeyboardShortcuts } from '@/components/admin/KeyboardShortcuts';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/admin/login';

    return (
        <AdminGuard>
            <div className="flex min-h-screen bg-muted">
                <AdminNav />
                <main className="flex-1 overflow-auto">
                    <div className="container mx-auto p-4 md:p-8">
                        {!isLoginPage && <Breadcrumbs autoGenerate />}
                        <ErrorBoundary>
                            {children}
                        </ErrorBoundary>
                    </div>
                </main>
                {!isLoginPage && <AdminKeyboardShortcuts />}
            </div>
        </AdminGuard>
    );
}
