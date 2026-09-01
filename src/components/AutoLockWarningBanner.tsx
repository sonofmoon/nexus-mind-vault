import React, { useEffect } from 'react';
import { AlertTriangle, Clock, Zap, Lock, ShieldAlert } from 'lucide-react';
import { vaultAudio } from '../utils/vaultAudioSynthesizer';

interface AutoLockWarningBannerProps {
  secondsLeft: number;
  onExtend: () => void;
  onLockNow: () => void;
}

export const AutoLockWarningBanner: React.FC<AutoLockWarningBannerProps> = ({
  secondsLeft,
  onExtend,
  onLockNow,
}) => {
  // Global Keyboard Shortcut: Ctrl+E or Cmd+E to Extend +5m
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        onExtend();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExtend]);

  const progressPct = Math.max(0, Math.min(100, (secondsLeft / 30) * 100));
  const isUrgent = secondsLeft <= 10;

  return (
    <aside
      id="auto-lock-floating-warning-banner"
      role="alert"
      aria-live="assertive"
      aria-label={`Security Alert: Sovereign Vault auto-locking in ${secondsLeft} seconds`}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9998,
        maxWidth: '420px',
        width: 'calc(100vw - 48px)',
        borderRadius: '16px',
        background: 'var(--bg-surface)',
        backdropFilter: 'blur(16px)',
        border: `1.5px solid ${isUrgent ? '#ef4444' : '#f59e0b'}`,
        boxShadow: `0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 30px ${isUrgent ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.2)'}`,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        color: '#ffffff',
        pointerEvents: 'auto',
      }}
    >
      {/* Top Info Bar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              border: `1px solid ${isUrgent ? 'rgba(239, 68, 68, 0.5)' : 'rgba(245, 158, 11, 0.5)'}`,
              color: isUrgent ? '#ef4444' : '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              animation: isUrgent ? 'pulse 1s infinite' : 'none',
            }}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Auto-Lock Warning
              </h4>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  padding: '2px 7px',
                  borderRadius: '100px',
                  background: isUrgent ? '#ef4444' : '#f59e0b',
                  color: '#000000',
                  letterSpacing: '0.5px',
                }}
              >
                0:{secondsLeft < 10 ? '0' : ''}{secondsLeft}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0', lineHeight: 1.4 }}>
              Vault will seal and purge decrypted keys in <strong style={{ color: isUrgent ? '#f87171' : '#fbbf24' }}>{secondsLeft}s</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Real-time Depleting Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '4px',
          borderRadius: '2px',
          background: 'rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPct}%`,
            background: isUrgent
              ? 'linear-gradient(90deg, #ef4444, #dc2626)'
              : 'linear-gradient(90deg, #f59e0b, #eab308)',
            transition: 'width 1s linear',
          }}
        />
      </div>

      {/* Action Buttons Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <button
          type="button"
          onClick={onLockNow}
          style={{
            padding: '7px 12px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#94a3b8',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Lock Now</span>
        </button>

        <button
          type="button"
          onClick={onExtend}
          style={{
            padding: '7px 16px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#ffffff',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.03)';
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(16, 185, 129, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.35)';
          }}
          title="Extend session by +5 minutes (Ctrl + E)"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Extend +5m (Ctrl+E)</span>
        </button>
      </div>
    </aside>
  );
};
