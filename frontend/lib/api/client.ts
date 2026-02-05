/**
 * Axios API Client with Interceptors
 * 
 * Centralized HTTP client with:
 * - Automatic token injection from Zustand auth store
 * - Global error handling
 * - Request/response logging
 * - Base URL configuration
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Base API configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : 'http://localhost:3001/api';

// Debug logging
if (typeof window !== 'undefined') {
    console.log('API Client Base URL:', API_BASE);
}

// Create axios instance
export const apiClient = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Request Interceptor - Inject Auth Token
 */
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Get token from localStorage (will migrate to Zustand store)
        const token = localStorage.getItem('token');

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Log requests in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data);
        }

        return config;
    },
    (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
    }
);

/**
 * Response Interceptor - Handle Errors Globally
 */
apiClient.interceptors.response.use(
    (response) => {
        // Log successful responses in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`, response.data);
        }
        return response;
    },
    (error: AxiosError<{ message?: string; statusCode?: number }>) => {
        // User-friendly error messages
        let errorMessage = 'An unexpected error occurred. Please try again.';

        if (error.response) {
            // Server responded with error status
            const status = error.response.status;
            const serverMessage = error.response.data?.message;

            switch (status) {
                case 400:
                    errorMessage = serverMessage || 'Invalid request. Please check your input.';
                    break;
                case 401:
                    errorMessage = 'Your session has expired. Please log in again.';
                    // Redirect to login
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        window.location.href = '/admin/login';
                    }
                    break;
                case 403:
                    errorMessage = 'You do not have permission to perform this action.';
                    break;
                case 404:
                    errorMessage = serverMessage || 'The requested resource was not found.';
                    break;
                case 409:
                    errorMessage = serverMessage || 'This action conflicts with existing data.';
                    break;
                case 422:
                    errorMessage = serverMessage || 'Validation failed. Please check your input.';
                    break;
                case 500:
                    errorMessage = 'Server error. Our team has been notified.';
                    break;
                case 503:
                    errorMessage = 'Service temporarily unavailable. Please try again later.';
                    break;
                default:
                    errorMessage = serverMessage || errorMessage;
            }

            console.error('[API] Response error:', {
                status,
                url: error.config?.url,
                message: errorMessage,
            });
        } else if (error.request) {
            // Request made but no response received
            errorMessage = 'Unable to connect to the server. Please check your internet connection.';
            console.error('[API] Network error:', error.request);
        } else {
            // Error in request configuration
            errorMessage = error.message || errorMessage;
            console.error('[API] Request setup error:', error.message);
        }

        // Create enhanced error object
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).originalError = error;
        (enhancedError as any).statusCode = error.response?.status;

        return Promise.reject(enhancedError);
    }
);

export default apiClient;
