import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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

  const getStyle = (type: ToastType): { bg: string; border: string; color: string; icon: string } => {
    switch (type) {
      case 'success':
        return { bg: '#f0fdf4', border: '#86efac', color: '#166534', icon: '✓' };
      case 'error':
        return { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', icon: '⚠️' };
      case 'warning':
        return { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: '🔔' };
      case 'info':
      default:
        return { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', icon: 'ℹ️' };
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
                borderRadius: 'var(--radius-md)',
                backgroundColor: s.bg,
                border: `1px solid ${s.border}`,
                color: s.color,
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '0.85rem',
                animation: 'slideIn 0.2s ease-out',
              }}
            >
              <span style={{ fontSize: '1rem' }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                {toast.title && <div style={{ fontWeight: '700', marginBottom: '2px' }}>{toast.title}</div>}
                <div>{toast.message}</div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Close notification"
                style={{
                  border: 'none',
                  background: 'none',
                  color: s.color,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  padding: '0 0 0 4px',
                }}
              >
                ×
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
