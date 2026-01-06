'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ThemeConfig } from '@/lib/types';
import { api } from '@/lib/api';

interface ThemeContextType {
    theme: ThemeConfig | null;
    mode: 'light' | 'dark';
    toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0, 0, 0';
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

function generateColorShades(baseColor: string) {
    // Simple shade generation - in production, use a color library
    const rgb = hexToRgb(baseColor);
    return {
        50: `rgb(${rgb}, 0.05)`,
        100: `rgb(${rgb}, 0.1)`,
        200: `rgb(${rgb}, 0.2)`,
        300: `rgb(${rgb}, 0.3)`,
        400: `rgb(${rgb}, 0.4)`,
        500: `rgb(${rgb}, 0.5)`,
        600: baseColor,
        700: `rgb(${rgb}, 0.7)`,
        800: `rgb(${rgb}, 0.8)`,
        900: `rgb(${rgb}, 0.9)`,
    };
}

function applyThemeToDOM(theme: ThemeConfig) {
    const root = document.documentElement;

    // Apply base colors
    root.style.setProperty('--color-primary', theme.primaryColor);
    root.style.setProperty('--color-secondary', theme.secondaryColor);
    root.style.setProperty('--color-accent', theme.accentColor);

    // Generate and apply shades
    const primaryShades = generateColorShades(theme.primaryColor);
    const secondaryShades = generateColorShades(theme.secondaryColor);
    const accentShades = generateColorShades(theme.accentColor);

    Object.entries(primaryShades).forEach(([shade, color]) => {
        root.style.setProperty(`--color-primary-${shade}`, color);
    });
    Object.entries(secondaryShades).forEach(([shade, color]) => {
        root.style.setProperty(`--color-secondary-${shade}`, color);
    });
    Object.entries(accentShades).forEach(([shade, color]) => {
        root.style.setProperty(`--color-accent-${shade}`, color);
    });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<ThemeConfig | null>(null);
    const [mode, setMode] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        // Load theme from backend on mount
        api.getTheme()
            .then((themeData: ThemeConfig) => {
                setTheme(themeData);
                setMode(themeData.defaultMode);
                applyThemeToDOM(themeData);

                // Apply dark mode class
                if (themeData.defaultMode === 'dark') {
                    document.documentElement.classList.add('dark');
                }
            })
            .catch((error) => {
                console.error('Failed to load theme:', error);
            });
    }, []);

    const toggleMode = () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setMode(newMode);

        if (newMode === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, mode, toggleMode }}>
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
