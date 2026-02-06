/**
 * React Query Provider
 * 
 * Configures QueryClient with optimized defaults for the application
 */

'use client';

import { QueryClient, QueryClientProvider as TanstackQueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryClientProvider({ children }: { children: React.ReactNode }) {
    // Create QueryClient instance (only created once per component instance)
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Global defaults for all queries
                        staleTime: 60 * 1000, // 1 minute
                        gcTime: 5 * 60 * 1000, // 5 minutes (previously cacheTime)
                        retry: 1, // Retry failed requests once
                        refetchOnWindowFocus: false, // Don't refetch on window focus
                        refetchOnReconnect: true, // Refetch when reconnecting
                    },
                    mutations: {
                        // Global defaults for all mutations
                        retry: 0, // Don't retry mutations
                    },
                },
            })
    );

    return (
        <TanstackQueryClientProvider client={queryClient}>
            {children}
            {/* Show React Query devtools in development */}
            {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} />
            )}
        </TanstackQueryClientProvider>
    );
}
