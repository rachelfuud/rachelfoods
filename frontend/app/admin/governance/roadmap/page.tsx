'use client';

import { useState, useEffect } from 'react';

interface RoadmapPhase {
    phase: string;
    sprint: string;
    status: string;
    objectives: string[];
    deliverables: string[];
    maturityTarget: number;
}

export default function GovernanceRoadmapPage() {
    const [roadmap, setRoadmap] = useState<RoadmapPhase[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: Fetch roadmap from backend
        setLoading(false);
        setRoadmap([]);
    }, []);

    const statusColors: Record<string, string> = {
        COMPLETED: 'bg-green-50 text-green-700 border-green-200',
        IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
        PLANNED: 'bg-gray-50 text-gray-700 border-gray-200',
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Governance Roadmap</h1>
                <p className="text-foreground/70">
                    Phased progression from foundational controls to regulator-ready compliance
                </p>
            </div>

            {/* Info Banner */}
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">🗺️</span>
                    <div>
                        <h3 className="font-semibold text-teal-900 mb-1">Strategic Roadmap</h3>
                        <p className="text-sm text-teal-700">
                            The governance roadmap shows the planned progression through maturity phases.
                            Each phase builds on previous controls to achieve regulatory compliance.
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-foreground/70">Loading roadmap...</p>
                </div>
            ) : roadmap.length === 0 ? (
                <div className="bg-background border border-border rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4">🗺️</div>
                    <h3 className="text-2xl font-bold mb-2">No roadmap data</h3>
                    <p className="text-foreground/70">
                        Roadmap phases will appear as governance planning progresses
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {roadmap.map((phase, index) => (
                        <div
                            key={index}
                            className="bg-background border border-border rounded-lg p-6"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-bold text-2xl">{phase.phase}</h3>
                                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusColors[phase.status]}`}>
                                            {phase.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <p className="text-foreground/70">{phase.sprint}</p>
                                </div>

                                <div className="text-right">
                                    <div className="text-3xl font-bold text-primary mb-1">
                                        {phase.maturityTarget}%
                                    </div>
                                    <p className="text-sm text-foreground/70">Target Maturity</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold mb-3">Objectives</h4>
                                    <ul className="space-y-2">
                                        {phase.objectives.map((obj, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="text-primary mt-0.5">●</span>
                                                <span className="text-sm">{obj}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-3">Deliverables</h4>
                                    <ul className="space-y-2">
                                        {phase.deliverables.map((deliverable, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="text-green-500 mt-0.5">✓</span>
                                                <span className="text-sm">{deliverable}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
