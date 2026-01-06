/**
 * Structured logging interface for consistent log format across all services
 * Format: {domain}_{action}_{status}
 * 
 * Reference: SPRINT_8_TRACK_D_HARDENING.md - Observability & Monitoring
 */
export interface LogEntry {
    event: string;
    timestamp?: string;
    level?: 'log' | 'warn' | 'error' | 'debug';

    userId?: string;
    orderId?: string;
    paymentId?: string;
    assignmentId?: string;

    duration?: number;

    error?: string;
    stack?: string;

    [key: string]: any;
}
