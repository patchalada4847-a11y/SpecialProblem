import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import ToastContext from './toastContext';

const toastStyles = {
  success: {
    icon: CheckCircle2,
    className: 'toast-success',
    role: 'status'
  },
  error: {
    icon: AlertCircle,
    className: 'toast-error',
    role: 'alert'
  },
  info: {
    icon: Info,
    className: 'toast-info',
    role: 'status'
  }
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message, type = 'info') => {
    const id = nextId.current++;
    const toast = { id, message: String(message), type: toastStyles[type] ? type : 'info' };
    setToasts((current) => [...current.slice(-3), toast]);
    timers.current.set(id, setTimeout(() => dismiss(id), 4500));
  }, [dismiss]);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => {
          const style = toastStyles[toast.type];
          const Icon = style.icon;
          return (
            <div key={toast.id} className={`toast-card ${style.className}`} role={style.role}>
              <Icon className="toast-icon" size={19} aria-hidden="true" />
              <p className="toast-message">{toast.message}</p>
              <button
                type="button"
                className="toast-close"
                onClick={() => dismiss(toast.id)}
                aria-label="ปิดการแจ้งเตือน"
              >
                <X size={17} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
