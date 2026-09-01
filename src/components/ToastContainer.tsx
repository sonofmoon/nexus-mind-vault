import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '380px',
      }}
    >
      {toasts.map((toast) => {
        let bg = 'var(--bg-card)';
        let border = 'var(--border-medium)';
        let Icon = Info;
        let iconColor = 'var(--accent-blue-light)';

        if (toast.type === 'success') {
          border = 'rgba(34, 197, 94, 0.4)';
          Icon = CheckCircle2;
          iconColor = 'var(--accent-emerald)';
        } else if (toast.type === 'error') {
          border = 'rgba(239, 68, 68, 0.4)';
          Icon = AlertCircle;
          iconColor = 'var(--accent-rose)';
        } else if (toast.type === 'warning') {
          border = 'rgba(245, 158, 11, 0.4)';
          Icon = AlertTriangle;
          iconColor = 'var(--accent-amber)';
        }

        return (
          <div
            key={toast.id}
            onClick={() => onRemove(toast.id)}
            style={{
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              boxShadow: 'var(--shadow-elevated)',
              cursor: 'pointer',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: iconColor }} />
            <span style={{ flex: 1 }}>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
};
