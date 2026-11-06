// =====================================================
// ToastContext: showToast(message, type)
// type: "success" | "error" | "warning" | "info"
// Toasts appear bottom-right and close by themselves.
// =====================================================
import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

const ICONS = {
  success: "bi-check-circle-fill",
  error: "bi-x-circle-fill",
  warning: "bi-exclamation-triangle-fill",
  info: "bi-info-circle-fill",
};

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const close = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const showToast = useCallback((message, type = "success") => {
    const id = nextId++;
    setToasts((list) => [...list.slice(-3), { id, message, type }]); // max 4 on screen
    setTimeout(() => close(id), 4000);
  }, [close]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`admin-toast t-${t.type}`} role="status">
            <i className={`bi ${ICONS[t.type] || ICONS.info}`}></i>
            <span className="flex-grow-1">{t.message}</span>
            <button type="button" className="btn-close" aria-label="Close" onClick={() => close(t.id)}></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
