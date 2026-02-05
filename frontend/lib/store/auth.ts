/**
 * Zustand Auth Store
 * 
 * Replaces AuthProvider context for better performance and simpler state management.
 * - Persists to localStorage automatically
 * - No prop drilling or context re-renders
 * - TypeScript support
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string | { name: string } | { role: { name: string } };
}

interface AuthState {
    user: User | null;
    token: string | null;
    loading: boolean;
    isAdmin: boolean;

    // Actions
    setAuth: (user: User, token: string) => void;
    logout: () => void;
    setLoading: (loading: boolean) => void;
}

/**
 * Helper function to extract role name from nested structure
 */
const getRoleName = (role: User['role']): string => {
    if (typeof role === 'string') return role;
    if (role && typeof role === 'object') {
        if ('role' in role && role.role && typeof role.role === 'object' && 'name' in role.role) {
            return (role.role as { name: string }).name;
        }
        if ('name' in role) {
            return (role as { name: string }).name;
        }
    }
    return '';
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            loading: true,
            isAdmin: false,

            setAuth: (user, token) => {
                const roleName = getRoleName(user.role);
                const isAdmin = roleName === 'ADMIN' || roleName === 'STAFF';

                set({
                    user,
                    token,
                    isAdmin,
                    loading: false,
                });
            },

            logout: () => {
                set({
                    user: null,
                    token: null,
                    isAdmin: false,
                    loading: false,
                });

                // Clear localStorage
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            },

            setLoading: (loading) => set({ loading }),
        }),
        {
            name: 'auth-storage',
            // Only persist user and token
            partialize: (state) => ({
                user: state.user,
                token: state.token,
            }),
            onRehydrateStorage: () => (state) => {
                // After hydration from localStorage, recalculate isAdmin and set loading to false
                if (state && state.user) {
                    const roleName = getRoleName(state.user.role);
                    state.isAdmin = roleName === 'ADMIN' || roleName === 'STAFF';
                }
                if (state) {
                    state.loading = false;
                }
            },
        }
    )
);

/**
 * Hook to get just the token (for API calls)
 */
export const useToken = () => useAuthStore((state) => state.token);

/**
 * Hook to get just the user
 */
export const useUser = () => useAuthStore((state) => state.user);

/**
 * Hook to get admin status
 */
export const useIsAdmin = () => useAuthStore((state) => state.isAdmin);

/**
 * Hook to get loading state
 */
export const useAuthLoading = () => useAuthStore((state) => state.loading);
