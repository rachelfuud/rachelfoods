'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface BuyAgainButtonProps {
    orderId: string;
    onSuccess?: (newOrderId: string) => void;
    className?: string;
}

export default function BuyAgainButton({ orderId, onSuccess, className = '' }: BuyAgainButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleReorder = async () => {
        try {
            setLoading(true);
            setError(null);

            const newOrder = await api.reorderFromPrevious(orderId);

            if (onSuccess) {
                onSuccess(newOrder.id);
            } else {
                // Redirect to checkout with the new order
                window.location.href = `/checkout?orderId=${newOrder.id}`;
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create order');
            console.error('Reorder error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <button
                onClick={handleReorder}
                disabled={loading}
                className={`inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
            >
                {loading ? (
                    <>
                        <LoadingSpinner size="sm" className="mr-2 border-t-white border-b-white" />
                        Creating Order...
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Buy Again
                    </>
                )}
            </button>
            {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}
