'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Image from 'next/image';
import { useState } from 'react';

export function AdminNav() {
    const pathname = usePathname();
    const { logout } = useAuth();
    const [cmsOpen, setCmsOpen] = useState(pathname.startsWith('/admin/cms'));

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

    const cmsItems = [
        { path: '/admin/cms/header', label: 'Header', icon: '🔝' },
        { path: '/admin/cms/footer', label: 'Footer', icon: '🔻' },
        { path: '/admin/cms/pages', label: 'Pages', icon: '📄' },
        { path: '/admin/cms/media', label: 'Media Library', icon: '🖼️' },
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

                    {/* CMS Section with Submenu */}
                    <div className="mt-2">
                        <button
                            onClick={() => setCmsOpen(!cmsOpen)}
                            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/cms')
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-muted text-foreground'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xl">📝</span>
                                <span className="font-medium">CMS</span>
                            </div>
                            <span className={`transition-transform ${cmsOpen ? 'rotate-180' : ''}`}>
                                ▼
                            </span>
                        </button>

                        {cmsOpen && (
                            <div className="mt-1 ml-4 pl-4 border-l-2 border-border space-y-1">
                                {cmsItems.map((item) => (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${pathname === item.path
                                            ? 'bg-primary text-white'
                                            : 'hover:bg-muted text-foreground'
                                            }`}
                                    >
                                        <span>{item.icon}</span>
                                        <span>{item.label}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </button>
        </div>
        </div >
    );
}
