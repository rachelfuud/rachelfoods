/**
 * PageLoader Component
 * 
 * A consistent full-page loading state with optional layout (Header/Footer).
 * Use this for page-level loading states instead of custom loading UI.
 * 
 * @example
 * // Simple full-page loader (no layout)
 * if (loading) return <PageLoader />;
 * 
 * // With custom message
 * if (loading) return <PageLoader message="Loading your profile..." />;
 * 
 * // With Header/Footer layout
 * if (loading) return <PageLoader message="Loading orders..." withLayout />;
 * 
 * // With emoji icon
 * if (loading) return <PageLoader message="Loading..." icon="⏳" withLayout />;
 */

import { LoadingSpinner } from './LoadingSpinner';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

interface PageLoaderProps {
    /** Loading message to display */
    message?: string;
    /** Optional emoji/icon to display above spinner */
    icon?: string;
    /** Include Header and Footer in the layout */
    withLayout?: boolean;
}

export function PageLoader({
    message = 'Loading...',
    icon,
    withLayout = false
}: PageLoaderProps) {
    const content = (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center py-20">
                {icon && <div className="text-6xl mb-6">{icon}</div>}
                <LoadingSpinner size="lg" centered />
                <p className="mt-6 text-lg text-foreground/70">{message}</p>
            </div>
        </div>
    );

    if (withLayout) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 container mx-auto px-4 py-8">
                    {content}
                </main>
                <Footer />
            </div>
        );
    }

    return content;
}
