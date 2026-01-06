import Link from 'next/link';

export default function AdminDashboard() {
    const stats = [
        { label: 'Pending Orders', value: '12', icon: '📦', href: '/admin/orders', color: 'bg-blue-50 border-blue-200 text-blue-700' },
        { label: 'Withdrawal Requests', value: '5', icon: '💰', href: '/admin/withdrawals', color: 'bg-green-50 border-green-200 text-green-700' },
        { label: 'Active Alerts', value: '3', icon: '⚠️', href: '/admin/alerts', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
        { label: 'Control Gaps', value: '8', icon: '🛡️', href: '/admin/governance/gaps', color: 'bg-purple-50 border-purple-200 text-purple-700' },
    ];

    const quickLinks = [
        { title: 'Orders Management', description: 'View and manage customer orders', href: '/admin/orders', icon: '📦' },
        { title: 'Withdrawals', description: 'View withdrawal requests and status', href: '/admin/withdrawals', icon: '💰' },
        { title: 'Risk Alerts', description: 'Monitor risk escalations and incidents', href: '/admin/alerts', icon: '⚠️' },
        { title: 'Governance Timeline', description: 'View governance maturity progression', href: '/admin/governance/timeline', icon: '📈' },
        { title: 'Control Gaps', description: 'Review governance control gaps', href: '/admin/governance/gaps', icon: '🔍' },
        { title: 'Evidence Ledger', description: 'Audit evidence and traceability', href: '/admin/governance/evidence', icon: '📋' },
        { title: 'Remediation Roadmap', description: 'View governance improvement plan', href: '/admin/governance/roadmap', icon: '🗺️' },
        { title: 'Theme Editor', description: 'Customize platform appearance', href: '/admin/theme', icon: '🎨' },
    ];

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
                <p className="text-foreground/70">Operations and governance visibility portal</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat) => (
                    <Link
                        key={stat.label}
                        href={stat.href}
                        className={`border rounded-lg p-6 hover:shadow-lg transition-shadow ${stat.color}`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-3xl">{stat.icon}</span>
                            <span className="text-3xl font-bold">{stat.value}</span>
                        </div>
                        <div className="font-semibold">{stat.label}</div>
                    </Link>
                ))}
            </div>

            {/* Quick Links */}
            <div>
                <h2 className="text-2xl font-bold mb-4">Quick Links</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickLinks.map((link) => (
                        <Link
                            key={link.title}
                            href={link.href}
                            className="bg-background border border-border rounded-lg p-6 hover:shadow-lg transition-shadow group"
                        >
                            <div className="text-4xl mb-3">{link.icon}</div>
                            <h3 className="font-bold mb-2 group-hover:text-primary transition-colors">
                                {link.title}
                            </h3>
                            <p className="text-sm text-foreground/70">{link.description}</p>
                        </Link>
                    ))}
                </div>
            </div>

            {/* System Info */}
            <div className="mt-8 p-6 bg-background border border-border rounded-lg">
                <h3 className="font-bold mb-3">ℹ️ System Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <span className="text-foreground/70">Platform Status:</span>
                        <span className="ml-2 font-semibold text-green-600">Operational</span>
                    </div>
                    <div>
                        <span className="text-foreground/70">Governance Stage:</span>
                        <span className="ml-2 font-semibold text-primary">Regulator-Ready</span>
                    </div>
                    <div>
                        <span className="text-foreground/70">Evidence Records:</span>
                        <span className="ml-2 font-semibold">Immutable</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
