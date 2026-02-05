/**
 * Auth API Endpoints
 * 
 * All authentication-related API calls
 */

import apiClient from '../client';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string | { name: string } | { role: { name: string } };
    };
}

export const authEndpoints = {
    /**
     * Login user
     */
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);
        return data;
    },

    /**
     * Register new user
     */
    register: async (userData: RegisterData): Promise<AuthResponse> => {
        const { data } = await apiClient.post<AuthResponse>('/auth/register', userData);
        return data;
    },

    /**
     * Get current user profile
     */
    getProfile: async (): Promise<AuthResponse['user']> => {
        const { data } = await apiClient.get<AuthResponse['user']>('/auth/profile');
        return data;
    },

    /**
     * Refresh access token
     */
    refreshToken: async (): Promise<{ token: string }> => {
        const { data } = await apiClient.post<{ token: string }>('/auth/refresh');
        return data;
    },
};
