'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface FooterLink {
    label: string;
    href: string;
}

interface FooterColumn {
    title: string;
    links: FooterLink[];
}

interface SocialLinks {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
}

interface FooterConfig {
    columns: FooterColumn[];
    social: SocialLinks;
    copyright: string;
    paymentIcons: {
        enabled: boolean;
        icons: string[];
    };
}

export default function FooterManagerPage() {
    const [config, setConfig] = useState<FooterConfig | null>(null);
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
                `${API_BASE}/admin/cms/config/footer`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            const data = await response.json();
            setConfig(data.config);
        } catch (error) {
            console.error('Failed to load footer config:', error);
            showToast('Failed to load footer configuration', 'error');
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
                `${API_BASE}/admin/cms/config/footer`,
                {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ config }),
                }
            );
            showToast('Footer configuration saved successfully!', 'success');
        } catch (error) {
            console.error('Failed to save footer config:', error);
            showToast('Failed to save configuration', 'error');
        } finally {
            setSaving(false);
        }
    };

    const addColumn = () => {
        if (!config) return;
        setConfig({
            ...config,
            columns: [
                ...config.columns,
                {
                    title: 'New Column',
                    links: [],
                },
            ],
        });
    };

    const updateColumn = (index: number, field: string, value: string) => {
        if (!config) return;
        const updated = [...config.columns];
        updated[index] = { ...updated[index], [field]: value };
        setConfig({ ...config, columns: updated });
    };

    const removeColumn = (index: number) => {
        if (!config) return;
        setConfig({
            ...config,
            columns: config.columns.filter((_, i) => i !== index),
        });
    };

    const addLink = (columnIndex: number) => {
        if (!config) return;
        const updated = [...config.columns];
        updated[columnIndex].links.push({ label: 'New Link', href: '/' });
        setConfig({ ...config, columns: updated });
    };

    const updateLink = (
        columnIndex: number,
        linkIndex: number,
        field: string,
        value: string
    ) => {
        if (!config) return;
        const updated = [...config.columns];
        updated[columnIndex].links[linkIndex] = {
            ...updated[columnIndex].links[linkIndex],
            [field]: value,
        };
        setConfig({ ...config, columns: updated });
    };

    const removeLink = (columnIndex: number, linkIndex: number) => {
        if (!config) return;
        const updated = [...config.columns];
        updated[columnIndex].links = updated[columnIndex].links.filter(
            (_, i) => i !== linkIndex
        );
        setConfig({ ...config, columns: updated });
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
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Footer Configuration</h1>
                    <p className="text-foreground/60 mt-1">Manage your site footer content and structure</p>
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

            {/* Footer Columns */}
            <div className="bg-background border border-border rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Footer Columns</h2>
                    <button
                        onClick={addColumn}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20"
                    >
                        + Add Column
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {config.columns.map((column, columnIndex) => (
                        <div
                            key={columnIndex}
                            className="border border-border rounded-lg p-4 space-y-3"
                        >
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={column.title}
                                    onChange={(e) =>
                                        updateColumn(columnIndex, 'title', e.target.value)
                                    }
                                    className="flex-1 px-3 py-2 border border-border rounded-md bg-background font-semibold"
                                    placeholder="Column Title"
                                />
                                <button
                                    onClick={() => removeColumn(columnIndex)}
                                    className="px-2 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-md"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-2">
                                {column.links.map((link, linkIndex) => (
                                    <div key={linkIndex} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={link.label}
                                            onChange={(e) =>
                                                updateLink(
                                                    columnIndex,
                                                    linkIndex,
                                                    'label',
                                                    e.target.value
                                                )
                                            }
                                            className="flex-1 px-2 py-1 border border-border rounded-md bg-background text-sm"
                                            placeholder="Link Label"
                                        />
                                        <input
                                            type="text"
                                            value={link.href}
                                            onChange={(e) =>
                                                updateLink(
                                                    columnIndex,
                                                    linkIndex,
                                                    'href',
                                                    e.target.value
                                                )
                                            }
                                            className="flex-1 px-2 py-1 border border-border rounded-md bg-background text-sm"
                                            placeholder="/path"
                                        />
                                        <button
                                            onClick={() => removeLink(columnIndex, linkIndex)}
                                            className="px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-md text-sm"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => addLink(columnIndex)}
                                className="w-full px-3 py-2 bg-muted hover:bg-muted/80 rounded-md text-sm"
                            >
                                + Add Link
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Social Media Links */}
            <div className="bg-background border border-border rounded-lg p-6 space-y-4">
                <h2 className="text-xl font-semibold">Social Media Links</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Facebook URL</label>
                        <input
                            type="url"
                            value={config.social.facebook || ''}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    social: { ...config.social, facebook: e.target.value },
                                })
                            }
                            className="w-full px-3 py-2 border border-border rounded-md bg-background"
                            placeholder="https://facebook.com/yourpage"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Twitter URL</label>
                        <input
                            type="url"
                            value={config.social.twitter || ''}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    social: { ...config.social, twitter: e.target.value },
                                })
                            }
                            className="w-full px-3 py-2 border border-border rounded-md bg-background"
                            placeholder="https://twitter.com/yourhandle"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Instagram URL</label>
                        <input
                            type="url"
                            value={config.social.instagram || ''}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    social: { ...config.social, instagram: e.target.value },
                                })
                            }
                            className="w-full px-3 py-2 border border-border rounded-md bg-background"
                            placeholder="https://instagram.com/yourprofile"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
                        <input
                            type="url"
                            value={config.social.linkedin || ''}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    social: { ...config.social, linkedin: e.target.value },
                                })
                            }
                            className="w-full px-3 py-2 border border-border rounded-md bg-background"
                            placeholder="https://linkedin.com/company/yourcompany"
                        />
                    </div>
                </div>
            </div>

            {/* Copyright Text */}
            <div className="bg-background border border-border rounded-lg p-6 space-y-4">
                <h2 className="text-xl font-semibold">Copyright Text</h2>
                <input
                    type="text"
                    value={config.copyright}
                    onChange={(e) =>
                        setConfig({
                            ...config,
                            copyright: e.target.value,
                        })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    placeholder="© 2025 Your Company. All rights reserved."
                />
            </div>

            {/* Payment Icons */}
            <div className="bg-background border border-border rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={config.paymentIcons.enabled}
                        onChange={(e) =>
                            setConfig({
                                ...config,
                                paymentIcons: {
                                    ...config.paymentIcons,
                                    enabled: e.target.checked,
                                },
                            })
                        }
                        className="w-5 h-5"
                    />
                    <h2 className="text-xl font-semibold">Show Payment Icons</h2>
                </div>
                {config.paymentIcons.enabled && (
                    <div className="pl-8 text-sm text-foreground/60">
                        Payment icons (Visa, MasterCard, PayPal, etc.) will be displayed in the
                        footer
                    </div>
                )}
            </div>

            {/* Preview */}
            <div className="bg-background border border-border rounded-lg p-6 space-y-4">
                <h2 className="text-xl font-semibold">Preview</h2>
                <div className="bg-muted rounded-lg p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                        {config.columns.map((column, index) => (
                            <div key={index}>
                                <h3 className="font-semibold mb-3">{column.title}</h3>
                                <ul className="space-y-2">
                                    {column.links.map((link, linkIndex) => (
                                        <li key={linkIndex} className="text-sm text-foreground/70">
                                            {link.label}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-border pt-6 flex items-center justify-between">
                        <div className="text-sm text-foreground/70">{config.copyright}</div>
                        {config.paymentIcons.enabled && (
                            <div className="text-xs text-foreground/50">
                                💳 Payment icons displayed here
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
