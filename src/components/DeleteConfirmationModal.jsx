import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, itemTitle }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay-container">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="modal-backdrop"
          />

          {/* Warning Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="modal-box"
            style={{ maxWidth: '400px' }}
          >
            {/* Header */}
            <div className="modal-header" style={{ borderBottom: 'none', marginBottom: '0.75rem' }}>
              <h3 style={{ color: 'var(--error)', gap: '0.45rem', display: 'flex', alignItems: 'center' }}>
                <AlertTriangle size={18} />
                CONFIRM_DELETION
              </h3>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ textAlign: 'left', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Are you sure you want to permanently delete the resource:
              </p>
              <p style={{ 
                fontSize: '0.85rem', 
                fontWeight: 700, 
                color: 'var(--text-primary)', 
                margin: '0.5rem 0',
                fontFamily: 'var(--font-heading)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                "{itemTitle}"
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                This action is reversible via the notification pop-up.
              </p>
            </div>

            {/* Actions */}
            <div className="modal-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
              <button type="button" className="btn-retro" onClick={onClose}>
                CANCEL
              </button>
              <button 
                type="button" 
                className="btn-retro" 
                style={{ 
                  borderColor: 'var(--error)', 
                  color: 'var(--error)', 
                  backgroundColor: 'var(--error-bg)' 
                }} 
                onClick={onConfirm}
              >
                DELETE
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
