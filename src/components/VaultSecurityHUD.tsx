import React, { useState } from 'react';
import { ShieldCheck, Lock, Activity, Clock, RefreshCw, AlertOctagon, Check } from 'lucide-react';
import { vaultAudio } from '../utils/vaultAudioSynthesizer';

interface VaultSecurityHUDProps {
  sessionHash?: string;
  autoLockSecondsLeft?: number;
  secondsLeft?: number;
  totalAutoLockSeconds?: number;
  vaultMode?: any;
  onExtendSession?: () => void;
  onPanicLock?: () => void;
  onEmergencyLock?: () => void;
  onToggleTheme?: () => void;
  theme?: 'dark' | 'light';
}

export const VaultSecurityHUD: React.FC<VaultSecurityHUDProps> = ({
  sessionHash = '0x8F4A9C2B7E1D3F00',
  autoLockSecondsLeft,
  secondsLeft,
  totalAutoLockSeconds,
  onExtendSession,
  onPanicLock,
  onEmergencyLock,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);

  // Safe numerical seconds extraction
  const safeSeconds = typeof secondsLeft === 'number' && !isNaN(secondsLeft)
    ? secondsLeft
    : typeof autoLockSecondsLeft === 'number' && !isNaN(autoLockSecondsLeft)
    ? autoLockSecondsLeft
    : 15 * 60;

  const safeTotalSeconds = typeof totalAutoLockSeconds === 'number' && !isNaN(totalAutoLockSeconds)
    ? totalAutoLockSeconds
    : 15 * 60;

  const formatTime = (secs: number) => {
    const validSecs = typeof secs === 'number' && !isNaN(secs) && secs >= 0 ? Math.floor(secs) : 0;
    const m = Math.floor(validSecs / 60);
    const s = validSecs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCopyHash = () => {
    if (sessionHash) {
      navigator.clipboard.writeText(sessionHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const [isHoldingPanic, setIsHoldingPanic] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = React.useRef<any>(null);

  const startPanicHold = () => {
    setIsHoldingPanic(true);
    setHoldProgress(0);
    const startTime = Date.now();
    const duration = 1800; // 1.8 seconds hold

    try { vaultAudio.playKeyClick(); } catch {}

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setHoldProgress(pct);

      if (elapsed >= duration) {
        clearInterval(holdTimerRef.current);
        setIsHoldingPanic(false);
        setHoldProgress(0);
        handlePanicClick();
      }
    }, 50);
  };

  const cancelPanicHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
    }
    setIsHoldingPanic(false);
    setHoldProgress(0);
  };

  const handlePanicClick = () => {
    try { vaultAudio.playPanicLockSound(); } catch {}
    if (onPanicLock) {
      onPanicLock();
    } else if (onEmergencyLock) {
      onEmergencyLock();
    }
  };

  const isLowTime = safeSeconds <= 60;
  const isCriticalTime = safeSeconds <= 15;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        fontSize: '11.5px',
        color: 'var(--text-secondary)',
        zIndex: 30,
        position: 'relative',
      }}
    >
      {/* Left: Enclave Status & Entropy Hash */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(52, 168, 83, 0.15)',
            border: '1.5px solid rgba(52, 168, 83, 0.35)',
            padding: '3px 10px',
            borderRadius: 'var(--radius-pill)',
            color: 'var(--text-main)',
            fontWeight: 700,
          }}
        >
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#34a853', boxShadow: '0 0 8px #34a853' }} />
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Sovereign Enclave</span>
        </div>

        {/* Cryptographic Session Hash (Google Material 3 High Contrast Button) */}
        <button
          type="button"
          onClick={handleCopyHash}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-surface)',
            border: '1.5px solid rgba(26, 115, 232, 0.45)',
            padding: '3px 10px',
            borderRadius: 'var(--radius-pill)',
            color: 'var(--text-main)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(26, 115, 232, 0.12)';
            e.currentTarget.style.borderColor = '#1a73e8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-surface)';
            e.currentTarget.style.borderColor = 'rgba(26, 115, 232, 0.45)';
          }}
          title="Click to copy cryptographic session verification hash"
        >
          <Activity className="w-3.5 h-3.5 text-blue-500" />
          <span><strong style={{ color: '#1a73e8' }}>Hash:</strong> {sessionHash.slice(0, 10)}...</span>
          {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : null}
        </button>

        {/* Air-gap proof tag */}
        <span
          className="hidden lg:inline-flex"
          style={{
            alignItems: 'center',
            gap: '5px',
            color: 'var(--text-main)',
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--bg-surface)',
            border: '1.5px solid var(--border-subtle)',
          }}
        >
          <span>Server Knowledge:</span>
          <strong style={{ color: '#10b981', fontWeight: 800 }}>0.00%</strong>
          <span style={{ color: 'var(--text-secondary)' }}>• Plaintext Isolated</span>
        </span>
      </div>

      {/* Right: Auto-Lock Countdown Timer, Routine Lock & Panic Purge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Auto-Lock Timer Ring / Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: isCriticalTime ? 'rgba(234, 67, 53, 0.15)' : isLowTime ? 'rgba(251, 188, 4, 0.15)' : 'var(--bg-surface)',
            border: isCriticalTime ? '1.5px solid rgba(234, 67, 53, 0.5)' : isLowTime ? '1.5px solid rgba(251, 188, 4, 0.5)' : '1.5px solid var(--border-subtle)',
            padding: '3px 10px',
            borderRadius: 'var(--radius-pill)',
            color: isCriticalTime ? '#ef4444' : isLowTime ? '#d97706' : 'var(--text-main)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
          }}
        >
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          <span>Auto-Lock: {formatTime(safeSeconds)}</span>
          <button
            type="button"
            onClick={onExtendSession}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#1a73e8',
              fontSize: '11px',
              cursor: 'pointer',
              marginLeft: '4px',
              textDecoration: 'underline',
              fontWeight: 800,
            }}
            title={`Reset auto-lock timer (+${Math.round(safeTotalSeconds / 60) || 5} minutes)`}
          >
            +{Math.round(safeTotalSeconds / 60) || 5}m
          </button>
        </div>

        {/* 1. Routine Session Lock Button */}
        <button
          type="button"
          onClick={onEmergencyLock}
          style={{
            background: 'var(--bg-surface)',
            border: '1.5px solid var(--border-subtle)',
            color: 'var(--text-main)',
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 'var(--radius-pill)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Routine Session Lock: Return to Protected Mode (Secret Gate remains accessible with Master PIN)"
        >
          <Lock className="w-3 h-3 text-blue-500" />
          <span>Lock</span>
        </button>

        {/* 2. Emergency Panic Purge Button (Duress Trap) */}
        <button
          type="button"
          onMouseDown={startPanicHold}
          onMouseUp={cancelPanicHold}
          onMouseLeave={cancelPanicHold}
          onTouchStart={startPanicHold}
          onTouchEnd={cancelPanicHold}
          style={{
            position: 'relative',
            background: isHoldingPanic ? '#991b1b' : '#d93025',
            border: 'none',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 12px',
            borderRadius: 'var(--radius-pill)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            boxShadow: isHoldingPanic ? '0 0 12px rgba(220, 38, 38, 0.8)' : '0 2px 8px rgba(217, 48, 37, 0.35)',
            transition: 'all 0.15s ease',
            userSelect: 'none',
            overflow: 'hidden',
          }}
          title="⚡ Emergency Panic Purge: Press & Hold for 2 seconds to zeroize memory & deploy cover decoy"
        >
          {isHoldingPanic && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${holdProgress}%`,
                background: 'rgba(255, 255, 255, 0.35)',
                transition: 'width 50ms linear',
              }}
            />
          )}
          <AlertOctagon className="w-3 h-3" />
          <span style={{ position: 'relative', zIndex: 2 }}>
            {isHoldingPanic ? `HOLD (${holdProgress}%)...` : 'Panic Purge'}
          </span>
        </button>
      </div>
    </div>
  );
};
