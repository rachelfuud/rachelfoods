'use client';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useTheme } from '@/components/ThemeProvider';

export default function ProfilePage() {
    const { mode, toggleMode } = useTheme();

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold mb-8">Profile</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Profile Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="border border-border rounded-lg p-6 bg-background">
                            <h2 className="text-2xl font-bold mb-4">Personal Information</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Email</label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                        placeholder="john@example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Phone</label>
                                    <input
                                        type="tel"
                                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                        placeholder="+1 234 567 8900"
                                    />
                                </div>

                                <button className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity">
                                    Save Changes
                                </button>
                            </div>
                        </div>

                        <div className="border border-border rounded-lg p-6 bg-background">
                            <h2 className="text-2xl font-bold mb-4">Delivery Addresses</h2>

                            <div className="space-y-4">
                                <div className="border border-border rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold">Home</h3>
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Default</span>
                                    </div>
                                    <p className="text-sm text-foreground/70">
                                        123 Main Street<br />
                                        New York, NY 10001<br />
                                        United States
                                    </p>
                                </div>

                                <button className="w-full py-3 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors">
                                    + Add New Address
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Settings */}
                    <div>
                        <div className="border border-border rounded-lg p-6 bg-background">
                            <h2 className="text-2xl font-bold mb-4">Settings</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Theme Mode</span>
                                        <button
                                            onClick={toggleMode}
                                            className="px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                                        >
                                            {mode === 'light' ? '🌙 Dark' : '☀️ Light'}
                                        </button>
                                    </label>
                                </div>

                                <div className="border-t border-border pt-4">
                                    <h3 className="font-semibold mb-3">Notifications</h3>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-3">
                                            <input type="checkbox" className="w-4 h-4" defaultChecked />
                                            <span className="text-sm">Order updates</span>
                                        </label>
                                        <label className="flex items-center gap-3">
                                            <input type="checkbox" className="w-4 h-4" defaultChecked />
                                            <span className="text-sm">Promotions</span>
                                        </label>
                                        <label className="flex items-center gap-3">
                                            <input type="checkbox" className="w-4 h-4" />
                                            <span className="text-sm">Newsletter</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="border-t border-border pt-4">
                                    <button className="w-full py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
