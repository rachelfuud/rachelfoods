'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Global page transition loader
 * Shows a progress bar at the top during navigation
 */
export function PageTransitionLoader() {
    const pathname = usePathname();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        const timeout = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timeout);
    }, [pathname]);

    if (!loading) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[200] h-1 bg-muted overflow-hidden">
            <div className="h-full bg-primary animate-loading-bar" />
        </div>
    );
}
