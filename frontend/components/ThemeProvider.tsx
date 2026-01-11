'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ThemeConfig } from '@/lib/types';
import { api } from '@/lib/api';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    theme: ThemeConfig | null;
    mode: ThemeMode;
    toggleMode: () => void;
    setTheme: (theme: ThemeConfig) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0, 0, 0';
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

function lightenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    const [r, g, b] = rgb.split(', ').map(Number);
    const factor = 1 + percent;
    return `#${Math.min(255, Math.round(r * factor)).toString(16).padStart(2, '0')}${Math.min(255, Math.round(g * factor)).toString(16).padStart(2, '0')}${Math.min(255, Math.round(b * factor)).toString(16).padStart(2, '0')}`;
}

function darkenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    const [r, g, b] = rgb.split(', ').map(Number);
    const factor = 1 - percent;
    return `#${Math.max(0, Math.round(r * factor)).toString(16).padStart(2, '0')}${Math.max(0, Math.round(g * factor)).toString(16).padStart(2, '0')}${Math.max(0, Math.round(b * factor)).toString(16).padStart(2, '0')}`;
}

function generateColorShades(baseColor: string) {
    return {
        50: lightenColor(baseColor, 0.95),
        100: lightenColor(baseColor, 0.85),
        200: lightenColor(baseColor, 0.70),
        300: lightenColor(baseColor, 0.50),
        400: lightenColor(baseColor, 0.25),
        500: baseColor,
        600: darkenColor(baseColor, 0.15),
        700: darkenColor(baseColor, 0.30),
        800: darkenColor(baseColor, 0.45),
        900: darkenColor(baseColor, 0.60),
    };
}

function applyThemeToDOM(theme: ThemeConfig, mode: ThemeMode) {
    const root = document.documentElement;

    // Generate shades
    const primaryShades = generateColorShades(theme.primaryColor);
    const secondaryShades = generateColorShades(theme.secondaryColor);
    const accentShades = generateColorShades(theme.accentColor);

    // Apply primary color shades
    root.style.setProperty('--color-primary', theme.primaryColor);
    Object.entries(primaryShades).forEach(([shade, color]) => {
        root.style.setProperty(`--color-primary-${shade}`, color);
    });

    // Apply secondary color shades
    root.style.setProperty('--color-secondary', theme.secondaryColor);
    Object.entries(secondaryShades).forEach(([shade, color]) => {
        root.style.setProperty(`--color-secondary-${shade}`, color);
    });

    // Apply accent color shades
    root.style.setProperty('--color-accent', theme.accentColor);
    Object.entries(accentShades).forEach(([shade, color]) => {
        root.style.setProperty(`--color-accent-${shade}`, color);
    });

    // Note: Semantic tokens (background, foreground, surface, etc.) are handled by CSS dark mode class
    // They are predefined in globals.css and switch automatically with .dark class
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemeConfig | null>(null);
    const [mode, setMode] = useState<ThemeMode>('light');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);

        // Default theme as fallback
        const defaultTheme: ThemeConfig = {
            id: 'default',
            primaryColor: '#2563eb',
            secondaryColor: '#7c3aed',
            accentColor: '#f59e0b',
            defaultMode: 'light',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Check localStorage for saved theme mode
        const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
        if (savedMode) {
            setMode(savedMode);
            if (savedMode === 'dark') {
                document.documentElement.classList.add('dark');
            }
        }

        // Load theme from backend on mount
        api.getTheme()
            .then((themeData: ThemeConfig) => {
                setThemeState(themeData);
                applyThemeToDOM(themeData, savedMode || themeData.defaultMode);

                // Apply default mode if no saved preference
                if (!savedMode) {
                    setMode(themeData.defaultMode);
                    if (themeData.defaultMode === 'dark') {
                        document.documentElement.classList.add('dark');
                    }
                }
            })
            .catch((error) => {
                console.error('Failed to load theme from backend, using default theme:', error);
                setThemeState(defaultTheme);
                applyThemeToDOM(defaultTheme, savedMode || 'light');
            });
    }, []);

    const toggleMode = () => {
        if (!isClient) return;

        const newMode: ThemeMode = mode === 'light' ? 'dark' : 'light';
        setMode(newMode);

        // Update DOM
        if (newMode === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Save to localStorage
        localStorage.setItem('theme-mode', newMode);
    };

    const setTheme = (newTheme: ThemeConfig) => {
        setThemeState(newTheme);
        if (isClient) {
            applyThemeToDOM(newTheme, mode);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, mode, toggleMode, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
