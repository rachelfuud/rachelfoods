'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';

interface AuthContextType {
    user: any | null;
    token: string | null;
    login: (email: string, password: string) => Promise<any>;
    logout: () => void;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<any | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        // Load token from localStorage on mount
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response = await api.login({ email, password });

            setUser(response.user);
            setToken(response.accessToken);
            localStorage.setItem('token', response.accessToken);
            localStorage.setItem('user', JSON.stringify(response.user));

            return response;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    // Check if user has admin or staff role
    const isAdmin = user?.roles?.some((role: any) => {
        const roleName = role.role?.name || role.name || role;
        return ['ADMIN', 'STAFF', 'Platform Admin', 'Platform Staff'].includes(roleName);
    }) || false;

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
