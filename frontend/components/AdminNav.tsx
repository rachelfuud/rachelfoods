'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Image from 'next/image';

export function AdminNav() {
    const pathname = usePathname();
    const { logout } = useAuth();

    const isActive = (path: string) => {
        if (path === '/admin') return pathname === '/admin';
        return pathname.startsWith(path);
    };

    const navItems = [
        { path: '/admin', label: 'Dashboard', icon: '📊' },
        { path: '/admin/orders', label: 'Orders', icon: '📦' },
        { path: '/admin/withdrawals', label: 'Withdrawals', icon: '💰' },
        { path: '/admin/alerts', label: 'Alerts', icon: '⚠️' },
        { path: '/admin/governance', label: 'Governance', icon: '🛡️' },
        { path: '/admin/theme', label: 'Theme', icon: '🎨' },
    ];

    return (
        <div className="w-64 bg-background border-r border-border h-screen sticky top-0 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-border">
                <Link href="/admin" className="flex items-center gap-3">
                    <Image
                        src="/logo.png"
                        alt="RachelFoods"
                        width={32}
                        height={32}
                        className="rounded"
                    />
                    <div>
                        <div className="font-bold text-primary">RachelFoods</div>
                        <div className="text-xs text-foreground/60">Admin Portal</div>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.path)
                                    ? 'bg-primary text-white'
                                    : 'hover:bg-muted text-foreground'
                                }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-border">
                <Link
                    href="/"
                    className="block mb-2 px-4 py-2 text-center rounded-lg border border-border hover:bg-muted transition-colors text-sm"
                >
                    ← Back to Site
                </Link>
                <button
                    onClick={logout}
                    className="w-full px-4 py-2 text-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium"
                >
                    Logout
                </button>
            </div>
        </div>
    );
}
