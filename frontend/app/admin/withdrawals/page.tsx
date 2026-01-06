'use client';

import { useState, useEffect } from 'react';

interface Withdrawal {
    id: string;
    userId: string;
    user: { fullName: string; email: string };
    amount: number;
    currency: string;
    status: string;
    requestedAt: string;
    approvedAt?: string;
    rejectedAt?: string;
}

export default function AdminWithdrawalsPage() {
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        // TODO: Fetch withdrawals from backend
        setLoading(false);
        setWithdrawals([]);
    }, []);

    const filteredWithdrawals = filter === 'ALL'
        ? withdrawals
        : withdrawals.filter(w => w.status === filter);

    const statusColors: Record<string, string> = {
        PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        APPROVED: 'bg-green-50 text-green-700 border-green-200',
        REJECTED: 'bg-red-50 text-red-700 border-red-200',
        COMPLETED: 'bg-blue-50 text-blue-700 border-blue-200',
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Withdrawals</h1>
                <p className="text-foreground/70">View withdrawal requests (Read-only)</p>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">ℹ️</span>
                    <div>
                        <h3 className="font-semibold text-blue-900 mb-1">Read-Only View</h3>
                        <p className="text-sm text-blue-700">
                            This is a status visibility interface. Withdrawal approvals are handled by the backend risk system.
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-background border border-border rounded-lg p-4 mb-6">
                <div className="flex flex-wrap gap-2">
                    {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg border transition-colors ${filter === status
                                    ? 'bg-primary text-white border-primary'
                                    : 'border-border hover:border-primary'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Withdrawals List */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-foreground/70">Loading withdrawals...</p>
                </div>
            ) : filteredWithdrawals.length === 0 ? (
                <div className="bg-background border border-border rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4">💰</div>
                    <h3 className="text-2xl font-bold mb-2">No withdrawals found</h3>
                    <p className="text-foreground/70">
                        {filter === 'ALL' ? 'No withdrawal requests yet' : `No ${filter} withdrawals`}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredWithdrawals.map((withdrawal) => (
                        <div
                            key={withdrawal.id}
                            className="bg-background border border-border rounded-lg p-6"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-2xl font-bold text-primary">
                                            {withdrawal.currency} {withdrawal.amount.toFixed(2)}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusColors[withdrawal.status]}`}>
                                            {withdrawal.status}
                                        </span>
                                    </div>

                                    <p className="text-sm text-foreground/70 mb-1">
                                        User: {withdrawal.user.fullName} ({withdrawal.user.email})
                                    </p>
                                    <p className="text-sm text-foreground/70">
                                        Requested: {new Date(withdrawal.requestedAt).toLocaleString()}
                                    </p>
                                    {withdrawal.approvedAt && (
                                        <p className="text-sm text-green-600">
                                            Approved: {new Date(withdrawal.approvedAt).toLocaleString()}
                                        </p>
                                    )}
                                    {withdrawal.rejectedAt && (
                                        <p className="text-sm text-red-600">
                                            Rejected: {new Date(withdrawal.rejectedAt).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
