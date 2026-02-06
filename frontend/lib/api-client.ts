/**
 * Authenticated API Client with automatic token refresh
 * Handles 401 errors and token expiration gracefully
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions extends RequestInit {
    skipAuth?: boolean;
}

/**
 * Get auth token from localStorage
 */
function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

/**
 * Clear auth data and redirect to login
 */
function handleAuthError(returnUrl?: string) {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth-storage');

    const currentPath = window.location.pathname;
    const isAdminPath = currentPath.startsWith('/admin');
    const loginPath = isAdminPath ? '/admin/login' : '/auth/login';
    const returnUrlParam = returnUrl || currentPath;

    window.location.href = `${loginPath}?returnUrl=${encodeURIComponent(returnUrlParam)}`;
}

/**
 * Make authenticated API request with automatic error handling
 */
export async function apiRequest<T = any>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;

    // Build headers
    const headers = new Headers(fetchOptions.headers);

    // Add auth token if not skipped
    if (!skipAuth) {
        const token = getToken();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
    }

    // Add content-type if not set and body exists
    if (fetchOptions.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            headers,
        });

        // Handle 401 Unauthorized
        if (response.status === 401) {
            handleAuthError();
            throw new Error('Authentication required. Redirecting to login...');
        }

        // Handle other errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Request failed with status ${response.status}`);
        }

        // Parse JSON response
        const data = await response.json();
        return data;
    } catch (error) {
        // Re-throw with context
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Network request failed');
    }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
    get: <T = any>(endpoint: string, options?: RequestOptions) =>
        apiRequest<T>(endpoint, { ...options, method: 'GET' }),

    post: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        }),

    put: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        }),

    patch: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        }),

    delete: <T = any>(endpoint: string, options?: RequestOptions) =>
        apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
    return !!getToken();
}

/**
 * Refresh authentication state
 * Call this after login to ensure auth state is up to date
 */
export function refreshAuth(user: any, token: string) {
    if (typeof window === 'undefined') return;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}
