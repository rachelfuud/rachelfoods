'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ToastContextType {
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Math.random().toString(36).substring(7);
        const newToast = { id, message, type };

        setToasts((prev) => [...prev, newToast]);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-100 space-y-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
                            min-w-75 p-4 rounded-lg shadow-lg flex items-center justify-between
                            animate-in slide-in-from-right duration-300
                            ${toast.type === 'success' ? 'bg-green-500 text-white' : ''}
                            ${toast.type === 'error' ? 'bg-red-500 text-white' : ''}
                            ${toast.type === 'info' ? 'bg-blue-500 text-white' : ''}
                        `}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xl">
                                {toast.type === 'success' && '✓'}
                                {toast.type === 'error' && '✕'}
                                {toast.type === 'info' && 'ℹ'}
                            </span>
                            <span className="font-medium">{toast.message}</span>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="ml-4 hover:opacity-70 transition-opacity"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}
