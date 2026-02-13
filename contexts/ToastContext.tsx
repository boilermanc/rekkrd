
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  action?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastState {
  message: string;
  type: ToastType;
  options?: ToastOptions;
  key: number;
}

interface ToastContextValue {
  toast: ToastState | null;
  visible: boolean;
  showToast: (message: string, type?: ToastType, options?: ToastOptions) => void;
  dismiss: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const keyRef = useRef(0);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => setToast(null), 300);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', options?: ToastOptions) => {
    clearTimeout(timerRef.current);
    keyRef.current += 1;
    setToast({ message, type, options, key: keyRef.current });
    setVisible(true);

    const duration = options?.duration ?? (options?.action ? 5000 : 3000);
    timerRef.current = setTimeout(dismiss, duration);
  }, [dismiss]);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, visible, showToast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
