'use client';

import { useState, useEffect } from 'react';

interface Alert {
    id: string;
    severity: string;
    source: string;
    message: string;
    timestamp: string;
    acknowledged: boolean;
}

export default function AdminAlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        // TODO: Fetch alerts from backend
        setLoading(false);
        setAlerts([]);
    }, []);

    const filteredAlerts = filter === 'ALL'
        ? alerts
        : alerts.filter(a => a.severity === filter);

    const severityColors: Record<string, string> = {
        CRITICAL: 'bg-red-50 text-red-700 border-red-200',
        HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
        MEDIUM: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        LOW: 'bg-blue-50 text-blue-700 border-blue-200',
    };

    const severityIcons: Record<string, string> = {
        CRITICAL: '🚨',
        HIGH: '⚠️',
        MEDIUM: '📢',
        LOW: 'ℹ️',
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Risk Alerts</h1>
                <p className="text-foreground/70">Monitor risk escalations and incidents (Read-only)</p>
            </div>

            {/* Info Banner */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <h3 className="font-semibold text-yellow-900 mb-1">Read-Only Alert List</h3>
                        <p className="text-sm text-yellow-700">
                            Alerts are generated automatically by the risk monitoring system.
                            This interface provides visibility into risk events.
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-background border border-border rounded-lg p-4 mb-6">
                <div className="flex flex-wrap gap-2">
                    {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => (
                        <button
                            key={severity}
                            onClick={() => setFilter(severity)}
                            className={`px-4 py-2 rounded-lg border transition-colors ${filter === severity
                                    ? 'bg-primary text-white border-primary'
                                    : 'border-border hover:border-primary'
                                }`}
                        >
                            {severity}
                        </button>
                    ))}
                </div>
            </div>

            {/* Alerts List */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-foreground/70">Loading alerts...</p>
                </div>
            ) : filteredAlerts.length === 0 ? (
                <div className="bg-background border border-border rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-2xl font-bold mb-2">No alerts</h3>
                    <p className="text-foreground/70">
                        {filter === 'ALL' ? 'All systems operating normally' : `No ${filter} alerts`}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredAlerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`border rounded-lg p-6 ${severityColors[alert.severity]}`}
                        >
                            <div className="flex items-start gap-4">
                                <span className="text-4xl">{severityIcons[alert.severity]}</span>

                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-sm font-bold border ${severityColors[alert.severity]}`}>
                                            {alert.severity}
                                        </span>
                                        <span className="text-sm text-foreground/70">
                                            {alert.source}
                                        </span>
                                        {alert.acknowledged && (
                                            <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded">
                                                ✓ Acknowledged
                                            </span>
                                        )}
                                    </div>

                                    <p className="font-semibold mb-2">{alert.message}</p>

                                    <p className="text-sm text-foreground/70">
                                        {new Date(alert.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
