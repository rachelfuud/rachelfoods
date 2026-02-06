'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';

interface AuthContextType {
    user: any | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<any>;
    logout: () => void;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<any | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load token from localStorage on mount
        const initAuth = () => {
            try {
                const savedToken = localStorage.getItem('token');
                const savedUser = localStorage.getItem('user');

                if (savedToken && savedUser) {
                    const parsedUser = JSON.parse(savedUser);
                    setToken(savedToken);
                    setUser(parsedUser);
                    console.log('AuthProvider: Loaded saved auth state', {
                        userId: parsedUser.id,
                        email: parsedUser.email
                    });
                } else {
                    console.log('AuthProvider: No saved auth state found');
                }
            } catch (error) {
                console.error('AuthProvider: Error loading saved auth', error);
                // Clear corrupted data
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response = await api.login({ email, password });

            setUser(response.user);
            setToken(response.accessToken);
            localStorage.setItem('token', response.accessToken);
            localStorage.setItem('user', JSON.stringify(response.user));

            console.log('AuthProvider: Login successful', { userId: response.user.id });
            return response;
        } catch (error) {
            console.error('AuthProvider: Login failed:', error);
            throw error;
        }
    };

    const logout = () => {
        console.log('AuthProvider: Logging out');
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage');
    };

    // Check if user has admin or staff role
    const isAdmin = user?.roles?.some((role: any) => {
        const roleName = role.role?.name || role.name || role;
        return ['ADMIN', 'STAFF', 'Platform Admin', 'Platform Staff'].includes(roleName);
    }) || false;

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin }}>
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
