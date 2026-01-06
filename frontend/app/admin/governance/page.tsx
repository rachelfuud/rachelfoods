'use client';

export default function GovernancePage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Governance Dashboard</h1>
                <p className="text-foreground/70">
                    Complete governance narrative from controls to compliance
                </p>
            </div>

            {/* Info Banner */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-8">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">🛡️</span>
                    <div>
                        <h3 className="font-semibold text-indigo-900 mb-1">Read-Only Governance Interface</h3>
                        <p className="text-sm text-indigo-700">
                            This interface consumes governance data from backend APIs.
                            All views are read-only - no mutations, no scoring, no admin-triggered operations.
                        </p>
                    </div>
                </div>
            </div>

            {/* Governance Modules Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <a
                    href="/admin/governance/timeline"
                    className="bg-background border border-border rounded-lg p-6 hover:shadow-lg hover:border-primary transition-all"
                >
                    <div className="text-4xl mb-4">📊</div>
                    <h3 className="font-bold text-xl mb-2">Timeline</h3>
                    <p className="text-sm text-foreground/70">
                        Maturity progression through governance phases
                    </p>
                </a>

                <a
                    href="/admin/governance/gaps"
                    className="bg-background border border-border rounded-lg p-6 hover:shadow-lg hover:border-primary transition-all"
                >
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="font-bold text-xl mb-2">Control Gaps</h3>
                    <p className="text-sm text-foreground/70">
                        Identified deficiencies with severity filtering
                    </p>
                </a>

                <a
                    href="/admin/governance/attribution"
                    className="bg-background border border-border rounded-lg p-6 hover:shadow-lg hover:border-primary transition-all"
                >
                    <div className="text-4xl mb-4">🔬</div>
                    <h3 className="font-bold text-xl mb-2">Attribution</h3>
                    <p className="text-sm text-foreground/70">
                        Root cause analysis and remediation ownership
                    </p>
                </a>

                <a
                    href="/admin/governance/remediation"
                    className="bg-background border border-border rounded-lg p-6 hover:shadow-lg hover:border-primary transition-all"
                >
                    <div className="text-4xl mb-4">📈</div>
                    <h3 className="font-bold text-xl mb-2">Remediation</h3>
                    <p className="text-sm text-foreground/70">
                        Projected maturity as gaps are resolved
                    </p>
                </a>

                <a
                    href="/admin/governance/roadmap"
                    className="bg-background border border-border rounded-lg p-6 hover:shadow-lg hover:border-primary transition-all"
                >
                    <div className="text-4xl mb-4">🗺️</div>
                    <h3 className="font-bold text-xl mb-2">Roadmap</h3>
                    <p className="text-sm text-foreground/70">
                        Phased progression to regulatory compliance
                    </p>
                </a>

                <a
                    href="/admin/governance/evidence"
                    className="bg-background border border-border rounded-lg p-6 hover:shadow-lg hover:border-primary transition-all"
                >
                    <div className="text-4xl mb-4">🔐</div>
                    <h3 className="font-bold text-xl mb-2">Evidence Ledger</h3>
                    <p className="text-sm text-foreground/70">
                        Cryptographic traceability for auditors
                    </p>
                </a>
            </div>

            {/* Governance Narrative Flow */}
            <div className="mt-12 bg-background border border-border rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-4">📖 Governance Narrative Flow</h3>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="px-4 py-2 bg-blue-50 border border-blue-200 rounded font-semibold">
                        Timeline
                    </span>
                    <span className="text-foreground/70">→</span>
                    <span className="px-4 py-2 bg-orange-50 border border-orange-200 rounded font-semibold">
                        Control Gaps
                    </span>
                    <span className="text-foreground/70">→</span>
                    <span className="px-4 py-2 bg-purple-50 border border-purple-200 rounded font-semibold">
                        Attribution
                    </span>
                    <span className="text-foreground/70">→</span>
                    <span className="px-4 py-2 bg-green-50 border border-green-200 rounded font-semibold">
                        Remediation
                    </span>
                    <span className="text-foreground/70">→</span>
                    <span className="px-4 py-2 bg-teal-50 border border-teal-200 rounded font-semibold">
                        Roadmap
                    </span>
                    <span className="text-foreground/70">→</span>
                    <span className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded font-semibold">
                        Evidence
                    </span>
                </div>
                <p className="text-sm text-foreground/70 mt-4">
                    The governance narrative tells a complete story: where we started (Timeline),
                    what needs fixing (Gaps), why gaps exist (Attribution), how we'll fix them (Remediation),
                    when we'll be compliant (Roadmap), and proof for regulators (Evidence).
                </p>
            </div>
        </div>
    );
}
