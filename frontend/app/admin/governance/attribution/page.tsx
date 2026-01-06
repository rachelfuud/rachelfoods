'use client';

import { useState, useEffect } from 'react';

interface GapAttribution {
    gapId: string;
    gapName: string;
    rootCause: string;
    category: string;
    affectedSystems: string[];
    remediationOwner: string;
    estimatedEffort: string;
    dependencies: string[];
}

export default function GovernanceAttributionPage() {
    const [attributions, setAttributions] = useState<GapAttribution[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: Fetch attributions from backend
        setLoading(false);
        setAttributions([]);
    }, []);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Gap Attribution</h1>
                <p className="text-foreground/70">
                    Root cause analysis and remediation ownership for control gaps
                </p>
            </div>

            {/* Info Banner */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">🔬</span>
                    <div>
                        <h3 className="font-semibold text-indigo-900 mb-1">Root Cause Analysis</h3>
                        <p className="text-sm text-indigo-700">
                            Attribution links gaps to root causes, affected systems, and remediation owners.
                            This data drives prioritization and roadmap planning.
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-foreground/70">Loading attributions...</p>
                </div>
            ) : attributions.length === 0 ? (
                <div className="bg-background border border-border rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-2xl font-bold mb-2">No attribution data</h3>
                    <p className="text-foreground/70">
                        Root cause analysis will appear as gaps are identified
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {attributions.map((attr) => (
                        <div
                            key={attr.gapId}
                            className="bg-background border border-border rounded-lg p-6"
                        >
                            <h3 className="font-bold text-xl mb-4">{attr.gapName}</h3>

                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h4 className="font-semibold text-sm text-red-600 mb-2">Root Cause</h4>
                                    <p className="text-sm bg-red-50 border border-red-200 rounded p-3">
                                        {attr.rootCause}
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-sm mb-2">Category</h4>
                                    <p className="text-sm bg-muted rounded p-3 font-medium">
                                        {attr.category.replace('_', ' ')}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h4 className="font-semibold text-sm mb-2">Remediation Owner</h4>
                                    <p className="text-sm">{attr.remediationOwner}</p>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-sm mb-2">Estimated Effort</h4>
                                    <p className="text-sm">{attr.estimatedEffort}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold text-sm mb-2">Affected Systems</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {attr.affectedSystems.map((system, i) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-sm"
                                            >
                                                {system}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {attr.dependencies.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-sm mb-2">Dependencies</h4>
                                        <ul className="space-y-1">
                                            {attr.dependencies.map((dep, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm">
                                                    <span className="text-primary">→</span>
                                                    <span>{dep}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
