import React, { useEffect } from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '380px',
        width: 'calc(100% - 48px)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        const borderColor = isSuccess ? '#22c55e' : isError ? '#ef4444' : isWarning ? '#f59e0b' : '#3b82f6';
        const icon = isSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : isError ? (
          <XCircle className="w-5 h-5 text-red-400" />
        ) : isWarning ? (
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        ) : (
          <Info className="w-5 h-5 text-blue-400" />
        );

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: 'var(--bg-card, #1e293b)',
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
              padding: '14px 16px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              position: 'relative',
              overflow: 'hidden',
              backdropFilter: 'blur(8px)',
              animation: 'toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {icon}
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', lineHeight: 1.4 }}>
                  {toast.message}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ⏱️ ITEM 31: Auto-Dismiss Animated Progress Bar */}
            <div
              className="toast-progress-bar"
              style={{
                height: '3px',
                width: '100%',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '100px',
                overflow: 'hidden',
                marginTop: '4px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: borderColor,
                  animation: 'toastProgress 4.5s linear forwards',
                  transformOrigin: 'left',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
