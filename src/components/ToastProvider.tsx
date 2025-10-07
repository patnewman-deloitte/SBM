import React from 'react';

export type ToastVariant = 'default' | 'success' | 'warning';

type Toast = {
  id: string;
  title?: string;
  description: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  pushToast: (toast: Omit<Toast, 'id'>) => void;
};

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

const createId = () => Math.random().toString(36).slice(2, 9);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const pushToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = createId();
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[80] flex max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto overflow-hidden rounded-xl border px-4 py-3 shadow-lg shadow-slate-900/60 transition ${
              toast.variant === 'success'
                ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-100'
                : toast.variant === 'warning'
                  ? 'border-amber-400/60 bg-amber-500/15 text-amber-100'
                  : 'border-slate-700 bg-slate-900/90 text-slate-100'
            }`}
          >
            {toast.title ? <p className="text-sm font-semibold">{toast.title}</p> : null}
            <p className="text-sm leading-relaxed">{toast.description}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

