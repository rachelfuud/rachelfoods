'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface MenuItem {
    label: string;
    href: string;
    order: number;
}

interface HeaderConfig {
    logo: {
        url: string;
        alt: string;
    };
    navigation: MenuItem[];
    announcement: {
        enabled: boolean;
        text: string;
        link: string;
        backgroundColor: string;
        textColor: string;
    };
}

export default function HeaderManagerPage() {
    const [config, setConfig] = useState<HeaderConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const API_BASE = process.env.NEXT_PUBLIC_API_URL
                ? `${process.env.NEXT_PUBLIC_API_URL}/api`
                : 'http://localhost:3001/api';
            const response = await fetch(
                `${API_BASE}/admin/cms/config/header`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            const data = await response.json();
            setConfig(data.config);
        } catch (error) {
            console.error('Failed to load header config:', error);
            showToast('Failed to load header configuration', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            const API_BASE = process.env.NEXT_PUBLIC_API_URL
                ? `${process.env.NEXT_PUBLIC_API_URL}/api`
                : 'http://localhost:3001/api';
            await fetch(
                `${API_BASE}/admin/cms/config/header`,
                {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ config }),
                }
            );
            showToast('Header configuration saved successfully!', 'success');
        } catch (error) {
            console.error('Failed to save header config:', error);
            showToast('Failed to save configuration', 'error');
        } finally {
            setSaving(false);
        }
    };

    const addMenuItem = () => {
        if (!config) return;
        setConfig({
            ...config,
            navigation: [
                ...config.navigation,
                {
                    label: 'New Link',
                    href: '/',
                    order: config.navigation.length + 1,
                },
            ],
        });
    };

    const updateMenuItem = (index: number, field: string, value: string) => {
        if (!config) return;
        const updated = [...config.navigation];
        updated[index] = { ...updated[index], [field]: value };
        setConfig({ ...config, navigation: updated });
    };

    const removeMenuItem = (index: number) => {
        if (!config) return;
        setConfig({
            ...config,
            navigation: config.navigation.filter((_, i) => i !== index),
        });
    };

    const moveMenuItem = (index: number, direction: 'up' | 'down') => {
        if (!config) return;
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= config.navigation.length) return;

        const updated = [...config.navigation];
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
        setConfig({ ...config, navigation: updated });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!config) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Header Configuration</h1>
                    <p className="text-foreground/60 mt-1">Manage your site header, logo, and navigation</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                    {saving && <LoadingSpinner size="sm" />}
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Logo Section */}
            <div className="bg-background border border-border rounded-lg p-6 space-y-4">
                <h2 className="text-xl font-semibold">Logo</h2>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">Logo URL</label>
                        <input
                            type="text"
                            value={config.logo.url}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    logo: { ...config.logo, url: e.target.value },
                                })
                            }
                            className="w-full px-3 py-2 border border-border rounded-md bg-background"
                            placeholder="/logo.png"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Alt Text</label>
                        <input
                            type="text"
                            value={config.logo.alt}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    logo: { ...config.logo, alt: e.target.value },
                                })
                            }
                            className="w-full px-3 py-2 border border-border rounded-md bg-background"
                            placeholder="Company Name"
                        />
                    </div>
                </div>
            </div>

            {/* Navigation Menu */}
            <div className="bg-background border border-border rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Navigation Menu</h2>
                    <button
                        onClick={addMenuItem}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20"
                    >
                        + Add Menu Item
                    </button>
                </div>

                <div className="space-y-3">
                    {config.navigation.map((item, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-3 p-4 border border-border rounded-md"
                        >
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={() => moveMenuItem(index, 'up')}
                                    disabled={index === 0}
                                    className="text-xs px-2 py-1 hover:bg-muted rounded disabled:opacity-30"
                                >
                                    ▲
                                </button>
                                <button
                                    onClick={() => moveMenuItem(index, 'down')}
                                    disabled={index === config.navigation.length - 1}
                                    className="text-xs px-2 py-1 hover:bg-muted rounded disabled:opacity-30"
                                >
                                    ▼
                                </button>
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={item.label}
                                    onChange={(e) => updateMenuItem(index, 'label', e.target.value)}
                                    className="px-3 py-2 border border-border rounded-md bg-background"
                                    placeholder="Label"
                                />
                                <input
                                    type="text"
                                    value={item.href}
                                    onChange={(e) => updateMenuItem(index, 'href', e.target.value)}
                                    className="px-3 py-2 border border-border rounded-md bg-background"
                                    placeholder="/path"
                                />
                            </div>
                            <button
                                onClick={() => removeMenuItem(index)}
                                className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-md"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Announcement Bar */}
            <div className="bg-background border border-border rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={config.announcement.enabled}
                        onChange={(e) =>
                            setConfig({
                                ...config,
                                announcement: { ...config.announcement, enabled: e.target.checked },
                            })
                        }
                        className="w-5 h-5"
                    />
                    <h2 className="text-xl font-semibold">Announcement Bar (Optional)</h2>
                </div>

                {config.announcement.enabled && (
                    <div className="space-y-3 pl-8">
                        <div>
                            <label className="block text-sm font-medium mb-1">Announcement Text</label>
                            <input
                                type="text"
                                value={config.announcement.text}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        announcement: { ...config.announcement, text: e.target.value },
                                    })
                                }
                                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                                placeholder="Free shipping on orders over $50!"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Link (optional)</label>
                            <input
                                type="text"
                                value={config.announcement.link}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        announcement: { ...config.announcement, link: e.target.value },
                                    })
                                }
                                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                                placeholder="/catalog"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Background Color</label>
                                <input
                                    type="color"
                                    value={config.announcement.backgroundColor}
                                    onChange={(e) =>
                                        setConfig({
                                            ...config,
                                            announcement: {
                                                ...config.announcement,
                                                backgroundColor: e.target.value,
                                            },
                                        })
                                    }
                                    className="w-full h-10 border border-border rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Text Color</label>
                                <input
                                    type="color"
                                    value={config.announcement.textColor}
                                    onChange={(e) =>
                                        setConfig({
                                            ...config,
                                            announcement: {
                                                ...config.announcement,
                                                textColor: e.target.value,
                                            },
                                        })
                                    }
                                    className="w-full h-10 border border-border rounded-md"
                                />
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium mb-2">Preview</label>
                            <div
                                className="text-center py-2 px-4 rounded-md"
                                style={{
                                    backgroundColor: config.announcement.backgroundColor,
                                    color: config.announcement.textColor,
                                }}
                            >
                                {config.announcement.text || 'Your announcement text will appear here'}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
