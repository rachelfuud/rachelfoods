'use client';

import { useState, useEffect } from 'react';

interface ThemeConfig {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    defaultMode: string;
}

export default function ThemeEditorPage() {
    const [theme, setTheme] = useState<ThemeConfig>({
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        accentColor: '#F59E0B',
        defaultMode: 'light',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        // TODO: Fetch current theme from backend
        setLoading(false);
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            // TODO: Save theme to backend via PATCH /api/theme
            await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
            alert('Theme saved successfully! Changes will apply across the platform.');
        } catch (error) {
            alert('Failed to save theme. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Theme Editor</h1>
                <p className="text-foreground/70">
                    Customize platform appearance with live preview
                </p>
            </div>

            {/* Info Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">🎨</span>
                    <div>
                        <h3 className="font-semibold text-purple-900 mb-1">Live Theme Editor</h3>
                        <p className="text-sm text-purple-700">
                            Changes apply immediately across the platform without rebuild.
                            CSS variables enable dynamic theming for customer and admin interfaces.
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-foreground/70">Loading theme...</p>
                </div>
            ) : (
                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Editor Panel */}
                    <div className="space-y-6">
                        <div className="bg-background border border-border rounded-lg p-6">
                            <h3 className="font-semibold text-lg mb-4">Color Configuration</h3>

                            <div className="space-y-6">
                                {/* Primary Color */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2">
                                        Primary Color
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={theme.primaryColor}
                                            onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                                            className="w-20 h-12 rounded border border-border cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={theme.primaryColor}
                                            onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                                            className="flex-1 px-4 py-2 border border-border rounded"
                                            placeholder="#3B82F6"
                                        />
                                    </div>
                                    <p className="text-sm text-foreground/70 mt-1">
                                        Used for buttons, links, and primary UI elements
                                    </p>
                                </div>

                                {/* Secondary Color */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2">
                                        Secondary Color
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={theme.secondaryColor}
                                            onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                                            className="w-20 h-12 rounded border border-border cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={theme.secondaryColor}
                                            onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                                            className="flex-1 px-4 py-2 border border-border rounded"
                                            placeholder="#10B981"
                                        />
                                    </div>
                                    <p className="text-sm text-foreground/70 mt-1">
                                        Used for success states and secondary actions
                                    </p>
                                </div>

                                {/* Accent Color */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2">
                                        Accent Color
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={theme.accentColor}
                                            onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                                            className="w-20 h-12 rounded border border-border cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={theme.accentColor}
                                            onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                                            className="flex-1 px-4 py-2 border border-border rounded"
                                            placeholder="#F59E0B"
                                        />
                                    </div>
                                    <p className="text-sm text-foreground/70 mt-1">
                                        Used for highlights, badges, and special emphasis
                                    </p>
                                </div>

                                {/* Default Mode */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2">
                                        Default Mode
                                    </label>
                                    <select
                                        value={theme.defaultMode}
                                        onChange={(e) => setTheme({ ...theme, defaultMode: e.target.value })}
                                        className="w-full px-4 py-2 border border-border rounded"
                                    >
                                        <option value="light">Light Mode</option>
                                        <option value="dark">Dark Mode</option>
                                        <option value="system">System Preference</option>
                                    </select>
                                    <p className="text-sm text-foreground/70 mt-1">
                                        Initial theme mode for new visitors
                                    </p>
                                </div>
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full mt-6 px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {saving ? '⏳ Saving...' : '💾 Save Theme'}
                            </button>
                        </div>

                        {/* Reset Option */}
                        <div className="bg-background border border-border rounded-lg p-6">
                            <h3 className="font-semibold mb-2">Reset to Default</h3>
                            <p className="text-sm text-foreground/70 mb-4">
                                Restore original theme colors and settings
                            </p>
                            <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                                🔄 Reset Theme
                            </button>
                        </div>
                    </div>

                    {/* Preview Panel */}
                    <div className="space-y-6">
                        <div className="bg-background border border-border rounded-lg p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-lg">Live Preview</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPreviewMode('light')}
                                        className={`px-3 py-1 rounded ${previewMode === 'light'
                                                ? 'bg-primary text-white'
                                                : 'border border-border'
                                            }`}
                                    >
                                        ☀️ Light
                                    </button>
                                    <button
                                        onClick={() => setPreviewMode('dark')}
                                        className={`px-3 py-1 rounded ${previewMode === 'dark'
                                                ? 'bg-primary text-white'
                                                : 'border border-border'
                                            }`}
                                    >
                                        🌙 Dark
                                    </button>
                                </div>
                            </div>

                            {/* Preview Components */}
                            <div
                                className={`border rounded-lg p-6 space-y-4 ${previewMode === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'
                                    }`}
                            >
                                <h4 className="font-bold text-lg">Sample UI Components</h4>

                                <button
                                    style={{ backgroundColor: theme.primaryColor }}
                                    className="px-4 py-2 text-white rounded-lg"
                                >
                                    Primary Button
                                </button>

                                <button
                                    style={{ backgroundColor: theme.secondaryColor }}
                                    className="px-4 py-2 text-white rounded-lg ml-2"
                                >
                                    Secondary Button
                                </button>

                                <div
                                    style={{ borderColor: theme.primaryColor }}
                                    className="border-2 rounded-lg p-4 mt-4"
                                >
                                    <p style={{ color: theme.primaryColor }} className="font-semibold">
                                        Sample Card with Primary Border
                                    </p>
                                    <p className={previewMode === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                                        This is how content will appear in the platform
                                    </p>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <span
                                        style={{ backgroundColor: theme.accentColor }}
                                        className="px-3 py-1 text-white rounded-full text-sm"
                                    >
                                        Accent Badge
                                    </span>
                                    <span
                                        style={{ backgroundColor: theme.secondaryColor }}
                                        className="px-3 py-1 text-white rounded-full text-sm"
                                    >
                                        Success Badge
                                    </span>
                                </div>

                                <a
                                    href="#"
                                    style={{ color: theme.primaryColor }}
                                    className="block mt-4 underline"
                                >
                                    Sample Link
                                </a>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-900 mb-2">💡 Preview Note</h4>
                            <p className="text-sm text-blue-700">
                                Changes are applied in real-time. Save to persist theme across all user sessions.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
