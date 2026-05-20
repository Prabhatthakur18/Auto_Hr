import { useState, useCallback } from 'react';
import { ToastItem } from '../components/ToastContainer';

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((type: 'success' | 'error', message: string, duration?: number) => {
    const id = Date.now().toString();
    const newToast: ToastItem = {
      id,
      type,
      message,
      duration,
    };

    setToasts(prev => [...prev, newToast]);
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    showToast('success', message, duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number) => {
    showToast('error', message, duration);
  }, [showToast]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return {
    toasts,
    showSuccess,
    showError,
    removeToast,
  };
};
