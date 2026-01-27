export interface JwtPayload {
    sub: string; // User ID
    email: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken?: string;
    user: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        status: string;
    };
}
