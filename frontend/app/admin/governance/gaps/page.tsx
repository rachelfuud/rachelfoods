'use client';

import { useState, useEffect } from 'react';

interface ControlGap {
    id: string;
    controlName: string;
    category: string;
    severity: string;
    description: string;
    currentState: string;
    targetState: string;
    identifiedAt: string;
}

export default function GovernanceGapsPage() {
    const [gaps, setGaps] = useState<ControlGap[]>([]);
    const [loading, setLoading] = useState(true);
    const [severityFilter, setSeverityFilter] = useState('ALL');
    const [categoryFilter, setCategoryFilter] = useState('ALL');

    useEffect(() => {
        // TODO: Fetch gaps from backend
        setLoading(false);
        setGaps([]);
    }, []);

    const filteredGaps = gaps.filter(gap => {
        if (severityFilter !== 'ALL' && gap.severity !== severityFilter) return false;
        if (categoryFilter !== 'ALL' && gap.category !== categoryFilter) return false;
        return true;
    });

    const severityColors: Record<string, string> = {
        CRITICAL: 'bg-red-50 text-red-700 border-red-200',
        HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
        MEDIUM: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        LOW: 'bg-blue-50 text-blue-700 border-blue-200',
    };

    const categories = ['ALL', 'AUTHENTICATION', 'AUTHORIZATION', 'DATA_PROTECTION', 'AUDIT', 'COMPLIANCE'];

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Control Gaps</h1>
                <p className="text-foreground/70">
                    Identified control deficiencies across governance domains
                </p>
            </div>

            {/* Info Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">🔍</span>
                    <div>
                        <h3 className="font-semibold text-amber-900 mb-1">Read-Only Gap Analysis</h3>
                        <p className="text-sm text-amber-700">
                            Control gaps are identified by automated scans and policy evaluations.
                            This view shows current state vs target state for compliance requirements.
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-background border border-border rounded-lg p-4 mb-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold mb-2">Severity</label>
                        <div className="flex flex-wrap gap-2">
                            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => (
                                <button
                                    key={severity}
                                    onClick={() => setSeverityFilter(severity)}
                                    className={`px-4 py-2 rounded-lg border transition-colors ${severityFilter === severity
                                            ? 'bg-primary text-white border-primary'
                                            : 'border-border hover:border-primary'
                                        }`}
                                >
                                    {severity}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">Category</label>
                        <div className="flex flex-wrap gap-2">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setCategoryFilter(category)}
                                    className={`px-4 py-2 rounded-lg border transition-colors ${categoryFilter === category
                                            ? 'bg-primary text-white border-primary'
                                            : 'border-border hover:border-primary'
                                        }`}
                                >
                                    {category.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Gaps List */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-foreground/70">Loading control gaps...</p>
                </div>
            ) : filteredGaps.length === 0 ? (
                <div className="bg-background border border-border rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-2xl font-bold mb-2">No control gaps</h3>
                    <p className="text-foreground/70">
                        {gaps.length === 0
                            ? 'All controls meet target requirements'
                            : 'No gaps match current filters'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredGaps.map((gap) => (
                        <div
                            key={gap.id}
                            className="bg-background border border-border rounded-lg p-6"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-bold text-lg">{gap.controlName}</h3>
                                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${severityColors[gap.severity]}`}>
                                            {gap.severity}
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-sm bg-muted">
                                            {gap.category.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <p className="text-sm text-foreground/70 mb-4">{gap.description}</p>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-sm font-semibold text-red-600 mb-1">Current State</h4>
                                            <p className="text-sm">{gap.currentState}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-green-600 mb-1">Target State</h4>
                                            <p className="text-sm">{gap.targetState}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="text-sm text-foreground/70 pt-4 border-t border-border">
                                Identified: {new Date(gap.identifiedAt).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
