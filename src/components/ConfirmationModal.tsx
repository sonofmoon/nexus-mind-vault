import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card, #1e293b)',
          border: isDestructive ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)',
          borderRadius: '16px',
          maxWidth: '440px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: isDestructive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDestructive ? '#ef4444' : '#3b82f6',
            }}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
            {title}
          </h3>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.5, marginBottom: '20px' }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 1, padding: '10px' }}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={isDestructive ? "btn btn-danger" : "btn btn-primary"}
            style={{ flex: 1, padding: '10px', background: isDestructive ? '#ef4444' : undefined, color: '#fff' }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
