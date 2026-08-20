import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast: ToastItem = { id, message, type, title };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getStyle = (type: ToastType): { bg: string; border: string; color: string; icon: React.ReactNode } => {
    switch (type) {
      case 'success':
        return { bg: 'var(--color-bg-secondary)', border: 'rgba(16, 185, 129, 0.35)', color: 'var(--color-text-primary)', icon: <CheckCircle2 size={16} color="var(--color-success)" /> };
      case 'error':
        return { bg: 'var(--color-bg-secondary)', border: 'rgba(239, 68, 68, 0.35)', color: 'var(--color-text-primary)', icon: <AlertCircle size={16} color="var(--color-error)" /> };
      case 'warning':
        return { bg: 'var(--color-bg-secondary)', border: 'rgba(245, 158, 11, 0.35)', color: 'var(--color-text-primary)', icon: <AlertTriangle size={16} color="#f59e0b" /> };
      case 'info':
      default:
        return { bg: 'var(--color-bg-secondary)', border: 'rgba(37, 99, 235, 0.35)', color: 'var(--color-text-primary)', icon: <Info size={16} color="var(--color-accent)" /> };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* TOAST CONTAINER */}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '360px',
          width: 'calc(100vw - 40px)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          const s = getStyle(toast.type);
          return (
            <div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              style={{
                pointerEvents: 'auto',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: s.bg,
                border: `1px solid ${s.border}`,
                color: s.color,
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.82rem',
                animation: 'slideIn 0.2s ease-out',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                {toast.title && <div style={{ fontWeight: '600', marginBottom: '2px' }}>{toast.title}</div>}
                <div>{toast.message}</div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Close notification"
                style={{
                  border: 'none',
                  background: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
