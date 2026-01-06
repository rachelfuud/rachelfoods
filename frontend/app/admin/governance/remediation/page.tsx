'use client';

import { useState, useEffect } from 'react';

interface RemediationForecast {
    timeframe: string;
    projectedScore: number;
    gapsResolved: number;
    totalGaps: number;
    milestones: string[];
}

export default function GovernanceRemediationPage() {
    const [forecast, setForecast] = useState<RemediationForecast[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: Fetch remediation forecast from backend
        setLoading(false);
        setForecast([]);
    }, []);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Remediation Forecast</h1>
                <p className="text-foreground/70">
                    Projected maturity progression as control gaps are resolved
                </p>
            </div>

            {/* Advisory Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">📈</span>
                    <div>
                        <h3 className="font-semibold text-blue-900 mb-1">Advisory Forecast</h3>
                        <p className="text-sm text-blue-700">
                            Projections are based on current gap analysis and estimated remediation timelines.
                            Actual progression may vary based on execution velocity and emerging requirements.
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-foreground/70">Loading forecast...</p>
                </div>
            ) : forecast.length === 0 ? (
                <div className="bg-background border border-border rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-2xl font-bold mb-2">No forecast data</h3>
                    <p className="text-foreground/70">
                        Remediation projections will appear as gaps and timelines are established
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {forecast.map((period, index) => (
                        <div
                            key={index}
                            className="bg-background border border-border rounded-lg p-6"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="font-bold text-xl mb-1">{period.timeframe}</h3>
                                    <p className="text-sm text-foreground/70">
                                        {period.gapsResolved} of {period.totalGaps} gaps resolved
                                    </p>
                                </div>

                                <div className="text-right">
                                    <div className="text-4xl font-bold text-primary mb-1">
                                        {period.projectedScore}%
                                    </div>
                                    <p className="text-sm text-foreground/70">Projected Score</p>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-6">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-foreground/70">Gap Resolution Progress</span>
                                    <span className="font-semibold">
                                        {Math.round((period.gapsResolved / period.totalGaps) * 100)}%
                                    </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-3">
                                    <div
                                        className="bg-primary rounded-full h-3 transition-all"
                                        style={{ width: `${(period.gapsResolved / period.totalGaps) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Milestones */}
                            <div>
                                <h4 className="font-semibold mb-3">Expected Milestones</h4>
                                <ul className="space-y-2">
                                    {period.milestones.map((milestone, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-green-500 mt-0.5">✓</span>
                                            <span className="text-sm">{milestone}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
