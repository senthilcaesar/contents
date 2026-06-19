import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, RotateCcw, Info } from 'lucide-react';

function ToastItem({ toast, onClose }) {
  useEffect(() => {
    const autoDismissTime = toast.duration || 5000;
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, autoDismissTime);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className="toast"
      style={{
        borderColor: toast.type === 'undo' ? 'var(--accent)' : 'var(--border)'
      }}
    >
      <div className="toast-left">
        {toast.type === 'undo' ? (
          <RotateCcw size={16} className="toast-icon-undo" style={{ color: 'var(--accent-text)' }} />
        ) : (
          <CheckCircle2 size={16} className="toast-icon-success" style={{ color: 'var(--success)' }} />
        )}
        <span className="toast-message">{toast.message}</span>
      </div>

      <div className="toast-actions-group">
        {toast.onAction && (
          <button
            className="toast-action"
            onClick={() => {
              toast.onAction();
              onClose(toast.id);
            }}
          >
            Undo
          </button>
        )}
        <button className="toast-close" onClick={() => onClose(toast.id)}>
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
}

export default function ToastContainer({ toasts, onClose }) {
  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}
