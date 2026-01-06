'use client';

import { useState, useEffect } from 'react';

interface TimelineEntry {
    sprint: number;
    phase: string;
    milestones: string[];
    maturityScore: number;
    timestamp: string;
}

export default function GovernanceTimelinePage() {
    const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: Fetch timeline from backend
        setLoading(false);
        setTimeline([]);
    }, []);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Governance Timeline</h1>
                <p className="text-foreground/70">
                    Maturity progression from foundational controls to regulator-ready platform
                </p>
            </div>

            {/* Info Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">📊</span>
                    <div>
                        <h3 className="font-semibold text-purple-900 mb-1">Read-Only Timeline View</h3>
                        <p className="text-sm text-purple-700">
                            This timeline is automatically generated from backend governance data.
                            Progression through phases is tracked by the governance engine.
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-foreground/70">Loading timeline...</p>
                </div>
            ) : timeline.length === 0 ? (
                <div className="bg-background border border-border rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4">📅</div>
                    <h3 className="text-2xl font-bold mb-2">No timeline data</h3>
                    <p className="text-foreground/70">Timeline entries will appear as governance progresses</p>
                </div>
            ) : (
                <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border"></div>

                    <div className="space-y-8">
                        {timeline.map((entry, index) => (
                            <div key={index} className="relative pl-20">
                                {/* Timeline Node */}
                                <div className="absolute left-6 -translate-x-1/2 w-4 h-4 bg-primary rounded-full border-4 border-background"></div>

                                {/* Timeline Card */}
                                <div className="bg-background border border-border rounded-lg p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-xl mb-1">
                                                Sprint {entry.sprint} - {entry.phase}
                                            </h3>
                                            <p className="text-sm text-foreground/70">
                                                {new Date(entry.timestamp).toLocaleDateString()}
                                            </p>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-3xl font-bold text-primary mb-1">
                                                {entry.maturityScore}%
                                            </div>
                                            <p className="text-sm text-foreground/70">Maturity Score</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold mb-2">Milestones:</h4>
                                        <ul className="space-y-1">
                                            {entry.milestones.map((milestone, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <span className="text-green-500">✓</span>
                                                    <span className="text-sm">{milestone}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
