'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EvidenceLedgerEntry {
    id: string;
    recordType: string;
    timestamp: string;
    hash: string;
    controlId: string;
    controlName: string;
    viewId?: string;
}

export default function GovernanceEvidencePage() {
    const [entries, setEntries] = useState<EvidenceLedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        // TODO: Fetch evidence ledger from backend
        setLoading(false);
        setEntries([]);
    }, []);

    const filteredEntries = filter === 'ALL'
        ? entries
        : entries.filter(e => e.recordType === filter);

    const recordTypes = ['ALL', 'GAP_ANALYSIS', 'REMEDIATION', 'AUDIT_LOG', 'COMPLIANCE_SCAN', 'POLICY_EVALUATION'];

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Evidence Ledger</h1>
                <p className="text-foreground/70">
                    Immutable governance evidence records with cryptographic traceability
                </p>
            </div>

            {/* Info Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">🔐</span>
                    <div>
                        <h3 className="font-semibold text-emerald-900 mb-1">Immutable Evidence Ledger</h3>
                        <p className="text-sm text-emerald-700">
                            All governance evidence is cryptographically hashed and stored in an append-only ledger.
                            Evidence records are immutable and tamper-evident for regulator/auditor verification.
                        </p>
                    </div>
                </div>
            </div>

            {/* Traceability Info */}
            <div className="bg-background border border-border rounded-lg p-6 mb-6">
                <h3 className="font-semibold mb-3">📍 Evidence Traceability Flow</h3>
                <div className="flex items-center gap-3 text-sm">
                    <span className="px-3 py-1 bg-blue-50 border border-blue-200 rounded">
                        1. View Section (Gaps, Timeline, etc.)
                    </span>
                    <span className="text-foreground/70">→</span>
                    <span className="px-3 py-1 bg-purple-50 border border-purple-200 rounded">
                        2. Record IDs (shown in views)
                    </span>
                    <span className="text-foreground/70">→</span>
                    <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded">
                        3. Ledger Entries (this page)
                    </span>
                </div>
                <p className="text-sm text-foreground/70 mt-3">
                    Each view displays Record IDs that link to cryptographic ledger entries below.
                    Auditors can verify integrity by checking hashes against source data.
                </p>
            </div>

            {/* Filters */}
            <div className="bg-background border border-border rounded-lg p-4 mb-6">
                <label className="block text-sm font-semibold mb-2">Record Type</label>
                <div className="flex flex-wrap gap-2">
                    {recordTypes.map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`px-4 py-2 rounded-lg border transition-colors ${filter === type
                                    ? 'bg-primary text-white border-primary'
                                    : 'border-border hover:border-primary'
                                }`}
                        >
                            {type.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Evidence List */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-foreground/70">Loading evidence ledger...</p>
                </div>
            ) : filteredEntries.length === 0 ? (
                <div className="bg-background border border-border rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-2xl font-bold mb-2">No evidence records</h3>
                    <p className="text-foreground/70">
                        {entries.length === 0
                            ? 'Evidence records will appear as governance operations occur'
                            : 'No records match current filter'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredEntries.map((entry) => (
                        <div
                            key={entry.id}
                            className="bg-background border border-border rounded-lg p-6"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-bold text-lg">{entry.controlName}</h3>
                                        <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-sm font-semibold">
                                            {entry.recordType.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-foreground/70">
                                        {new Date(entry.timestamp).toLocaleString()}
                                    </p>
                                </div>

                                <div className="text-right">
                                    <span className="text-xs text-foreground/70">Record ID</span>
                                    <p className="font-mono text-sm">{entry.id}</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-foreground/70 mb-1">Control ID</h4>
                                    <p className="font-mono text-sm">{entry.controlId}</p>
                                </div>

                                {entry.viewId && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground/70 mb-1">View ID</h4>
                                        <p className="font-mono text-sm">{entry.viewId}</p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-muted rounded p-3">
                                <h4 className="text-sm font-semibold text-foreground/70 mb-1">Cryptographic Hash</h4>
                                <p className="font-mono text-xs break-all">{entry.hash}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Export Options */}
            <div className="mt-8 bg-background border border-border rounded-lg p-6">
                <h3 className="font-semibold mb-4">Export Evidence for Regulators</h3>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity">
                        📥 Export All Evidence (JSON)
                    </button>
                    <button className="px-4 py-2 border border-border rounded-lg hover:border-primary transition-colors">
                        📄 Generate Audit Report (PDF)
                    </button>
                    <button className="px-4 py-2 border border-border rounded-lg hover:border-primary transition-colors">
                        🔐 Export with Signatures
                    </button>
                </div>
                <p className="text-sm text-foreground/70 mt-3">
                    Evidence exports include all record IDs, hashes, and timestamps for independent verification.
                </p>
            </div>
        </div>
    );
}
