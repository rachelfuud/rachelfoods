'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface QuickActionCardProps {
    icon: string | ReactNode;
    title: string;
    description: string;
    href: string;
    badge?: string;
    badgeColor?: 'primary' | 'success' | 'warning' | 'danger';
}

export function QuickActionCard({
    icon,
    title,
    description,
    href,
    badge,
    badgeColor = 'primary',
}: QuickActionCardProps) {
    const badgeColors = {
        primary: 'bg-primary/10 text-primary border-primary/20',
        success: 'bg-green-500/10 text-green-600 border-green-500/20',
        warning: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
        danger: 'bg-red-500/10 text-red-600 border-red-500/20',
    };

    return (
        <Link href={href}>
            <div className="group relative bg-card border border-border rounded-lg p-6 hover:border-primary/50 hover:shadow-lg transition-all duration-200 cursor-pointer h-full">
                {/* Badge */}
                {badge && (
                    <div className="absolute -top-2 -right-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${badgeColors[badgeColor]}`}>
                            {badge}
                        </span>
                    </div>
                )}

                {/* Icon */}
                <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary text-2xl group-hover:scale-110 transition-transform">
                    {icon}
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
                    {title}
                </h3>
                <p className="text-sm text-muted-foreground">
                    {description}
                </p>

                {/* Arrow indicator */}
                <div className="mt-4 flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="mr-1">Go</span>
                    <svg
                        className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                        />
                    </svg>
                </div>
            </div>
        </Link>
    );
}

interface QuickActionsGridProps {
    children: ReactNode;
}

export function QuickActionsGrid({ children }: QuickActionsGridProps) {
    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">Quick Actions</h2>
                <span className="text-sm text-muted-foreground">Common tasks</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {children}
            </div>
        </div>
    );
}
