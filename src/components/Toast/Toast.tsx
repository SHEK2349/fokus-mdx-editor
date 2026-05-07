/**
 * Toast Notification Component
 *
 * 保存成功・エラーなどのフィードバックをトースト通知で表示
 */

import { useState, useEffect, useCallback } from 'react';

export interface ToastMessage {
    id: number;
    text: string;
    type: 'success' | 'error' | 'info';
}

interface ToastContainerProps {
    toasts: ToastMessage[];
    onRemove: (id: number) => void;
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: number) => void }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, 3000);
        return () => clearTimeout(timer);
    }, [toast.id, onRemove]);

    return (
        <div className={`toast toast-${toast.type}`}>
            <span className="toast-icon">
                {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
            </span>
            <span className="toast-text">{toast.text}</span>
        </div>
    );
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
}

// Custom hook for managing toasts
let toastIdCounter = 0;

export function useToast() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
        const id = ++toastIdCounter;
        setToasts((prev) => [...prev, { id, text, type }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return { toasts, addToast, removeToast };
}

export default ToastContainer;
