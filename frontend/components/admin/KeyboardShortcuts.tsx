'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    action: () => void;
    description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            shortcuts.forEach((shortcut) => {
                const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
                const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
                const altMatch = shortcut.alt ? event.altKey : !event.altKey;

                if (
                    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
                    ctrlMatch &&
                    shiftMatch &&
                    altMatch
                ) {
                    event.preventDefault();
                    shortcut.action();
                }
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
}

export function KeyboardShortcutsHelp() {
    const [isOpen, setIsOpen] = useState(false);

    const shortcuts = [
        { keys: ['Ctrl', 'Shift', 'D'], description: 'Go to Dashboard' },
        { keys: ['Ctrl', 'Shift', 'O'], description: 'Go to Orders' },
        { keys: ['Ctrl', 'Shift', 'P'], description: 'Go to Products' },
        { keys: ['Ctrl', 'Shift', 'H'], description: 'Go to Hero Slides' },
        { keys: ['Ctrl', 'Shift', 'T'], description: 'Go to Theme Settings' },
        { keys: ['?'], description: 'Show this help' },
    ];

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '?' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                setIsOpen(!isOpen);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 w-10 h-10 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-lg font-bold z-40"
                title="Keyboard shortcuts (Press ?)"
            >
                ?
            </button>
        );
    }

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setIsOpen(false)}
        >
            <div
                className="bg-background border border-border rounded-lg shadow-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-3">
                    {shortcuts.map((shortcut, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between py-2 border-b border-border last:border-0"
                        >
                            <span className="text-sm text-foreground">{shortcut.description}</span>
                            <div className="flex items-center gap-1">
                                {shortcut.keys.map((key, keyIndex) => (
                                    <span key={keyIndex}>
                                        <kbd className="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded">
                                            {key}
                                        </kbd>
                                        {keyIndex < shortcut.keys.length - 1 && (
                                            <span className="mx-1 text-muted-foreground">+</span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground text-center">
                    Press <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded">ESC</kbd> or
                    click outside to close
                </div>
            </div>
        </div>
    );
}

export function AdminKeyboardShortcuts() {
    const router = useRouter();

    const shortcuts: KeyboardShortcut[] = [
        {
            key: 'd',
            ctrl: true,
            shift: true,
            action: () => router.push('/admin'),
            description: 'Go to Dashboard',
        },
        {
            key: 'o',
            ctrl: true,
            shift: true,
            action: () => router.push('/admin/orders'),
            description: 'Go to Orders',
        },
        {
            key: 'p',
            ctrl: true,
            shift: true,
            action: () => router.push('/admin/products'),
            description: 'Go to Products',
        },
        {
            key: 'h',
            ctrl: true,
            shift: true,
            action: () => router.push('/admin/hero-slides'),
            description: 'Go to Hero Slides',
        },
        {
            key: 't',
            ctrl: true,
            shift: true,
            action: () => router.push('/admin/theme'),
            description: 'Go to Theme Settings',
        },
    ];

    useKeyboardShortcuts(shortcuts);

    return <KeyboardShortcutsHelp />;
}
