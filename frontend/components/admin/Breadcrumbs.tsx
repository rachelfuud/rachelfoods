'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface BreadcrumbItem {
    label: string;
    href?: string;
    icon?: ReactNode;
}

interface BreadcrumbsProps {
    items?: BreadcrumbItem[];
    autoGenerate?: boolean;
}

export function Breadcrumbs({ items, autoGenerate = false }: BreadcrumbsProps) {
    const pathname = usePathname();

    // Auto-generate breadcrumbs from pathname if not provided
    const breadcrumbItems = items || (autoGenerate ? generateBreadcrumbs(pathname) : []);

    if (breadcrumbItems.length === 0) {
        return null;
    }

    return (
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
            {/* Home icon */}
            <Link
                href="/admin"
                className="hover:text-foreground transition-colors"
                aria-label="Admin Dashboard"
            >
                <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                </svg>
            </Link>

            {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1;

                return (
                    <div key={index} className="flex items-center space-x-2">
                        {/* Separator */}
                        <svg
                            className="w-4 h-4"
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

                        {/* Breadcrumb item */}
                        {isLast || !item.href ? (
                            <span className="text-foreground font-medium flex items-center gap-1">
                                {item.icon}
                                {item.label}
                            </span>
                        ) : (
                            <Link
                                href={item.href}
                                className="hover:text-foreground transition-colors flex items-center gap-1"
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}

// Helper function to auto-generate breadcrumbs from pathname
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
    // Remove /admin prefix and split path
    const paths = pathname.replace('/admin', '').split('/').filter(Boolean);

    const breadcrumbs: BreadcrumbItem[] = [];
    let currentPath = '/admin';

    paths.forEach((path, index) => {
        currentPath += `/${path}`;

        // Format label (capitalize and replace hyphens)
        const label = path
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        // Don't add href to last item (current page)
        const isLast = index === paths.length - 1;

        breadcrumbs.push({
            label,
            href: isLast ? undefined : currentPath,
        });
    });

    return breadcrumbs;
}
