/**
 * Auth Hook using Zustand
 * 
 * Replaces useAuth context hook
 */

import { useMutation } from '@tanstack/react-query';
import { authEndpoints, LoginCredentials, RegisterData } from '../api/endpoints/auth';
import { useAuthStore } from '../store/auth';

/**
 * Login mutation
 */
export function useLogin() {
    const setAuth = useAuthStore((state) => state.setAuth);

    return useMutation({
        mutationFn: (credentials: LoginCredentials) => authEndpoints.login(credentials),
        onSuccess: (data) => {
            setAuth(data.user, data.token);
        },
    });
}

/**
 * Register mutation
 */
export function useRegister() {
    const setAuth = useAuthStore((state) => state.setAuth);

    return useMutation({
        mutationFn: (userData: RegisterData) => authEndpoints.register(userData),
        onSuccess: (data) => {
            setAuth(data.user, data.token);
        },
    });
}

/**
 * Logout function (not a mutation, just clears state)
 */
export function useLogout() {
    const logout = useAuthStore((state) => state.logout);
    return logout;
}

/**
 * Re-export Zustand hooks for convenience
 */
export { useAuthStore, useToken, useUser, useIsAdmin, useAuthLoading } from '../store/auth';
