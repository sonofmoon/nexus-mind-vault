import { verifyPinCode } from '../services/cryptoEngine';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserSession, VaultCredentials } from '../types';
import { NexusMindVaultLogo } from './NexusMindVaultLogo';
import { Shield, AlertTriangle, LogOut, Delete, KeyRound } from 'lucide-react';
import { vaultAudio } from '../utils/vaultAudioSynthesizer';
import { getVaultSettings } from '../services/vaultStorage';

interface PVUnlockScreenProps {
  user: UserSession;
  credentials: VaultCredentials;
  onUnlockSuccess: (mode: 'standard' | 'duress') => void;
  onSignOut: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const PVUnlockScreen: React.FC<PVUnlockScreenProps> = ({
  user,
  credentials,
  onUnlockSuccess,
  onSignOut,
  showToast,
}) => {
  const [pin, setPin] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [imgError, setImgError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setImgError(false);
  }, [user?.photoURL]);

  // Auto-focus input on mount and on clicks
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle Lockout countdown
  useEffect(() => {
    if (lockoutSeconds > 0) {
      const timer = setInterval(() => {
        setLockoutSeconds((prev) => {
          if (prev <= 1) {
            setIsLockedOut(false);
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutSeconds]);

  // Submit and verify PIN
  const handleVerifyPin = useCallback(
    async (enteredPin: string) => {
      if (isLockedOut) return;

      const settings = getVaultSettings(user.uid);
      const targetDuress = settings?.duressPin || (credentials as any).duressPin || '999888';
      const isMasterPinValid = await verifyPinCode(enteredPin, credentials);

      if (enteredPin === targetDuress) {
        // Duress Mode: Seamless plausible deniability (Zero alarm)
        try { vaultAudio.playUnlockSuccess(); } catch {}
        onUnlockSuccess('duress');
      } else if (isMasterPinValid) {
        // Standard Protected Vault Mode
        try { vaultAudio.playUnlockSuccess(); } catch {}
        onUnlockSuccess('standard');
      } else {
        // Incorrect PIN
        try { vaultAudio.playErrorBuzzer(); } catch {}
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setPin('');

        const nextFailures = failedAttempts + 1;
        setFailedAttempts(nextFailures);

        if (nextFailures >= 5) {
          setIsLockedOut(true);
          setLockoutSeconds(30);
          showToast('Security Lockout: Too many incorrect attempts. Please wait 30s.', 'error');
        } else {
          showToast(`Incorrect PIN. ${5 - nextFailures} attempt(s) remaining.`, 'error');
        }
      }
    },
    [user.uid, credentials, failedAttempts, isLockedOut, onUnlockSuccess, showToast]
  );

  // Handle input change from physical keyboard / paste
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLockedOut) return;
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 6);
    try { vaultAudio.playKeyClick(); } catch {}
    setPin(rawVal);
    if (rawVal.length === 6) {
      setTimeout(() => handleVerifyPin(rawVal), 100);
    }
  };

  // On-screen Keypad click handler
  const handleDigitClick = (digit: string) => {
    if (isLockedOut || pin.length >= 6) return;
    try { vaultAudio.playKeyClick(); } catch {}
    const nextPin = pin + digit;
    setPin(nextPin);
    if (nextPin.length === 6) {
      setTimeout(() => handleVerifyPin(nextPin), 100);
    }
    inputRef.current?.focus();
  };

  // Backspace handler
  const handleDeleteClick = () => {
    if (isLockedOut || pin.length === 0) return;
    try { vaultAudio.playKeyClick(); } catch {}
    setPin((prev) => prev.slice(0, -1));
    inputRef.current?.focus();
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'var(--bg-main)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        position: 'relative',
      }}
    >
      {/* Hidden real input for native physical keyboard & mobile compatibility */}
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={pin}
        onChange={handleInputChange}
        disabled={isLockedOut}
        autoFocus
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          top: 0,
          left: 0,
        }}
      />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>
        {/* Main Card Container */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: '24px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-elevated)',
            padding: '36px 30px',
            textAlign: 'center',
          }}
        >
          {/* Logo & Brand Header */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            <NexusMindVaultLogo height={38} />
          </div>

          <h2
            style={{
              fontSize: '20px',
              fontWeight: 600,
              margin: '0 0 6px 0',
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            Protected Vault Lock
          </h2>

          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              margin: '0 0 18px 0',
            }}
          >
            Enter your 6-digit PIN to access your vault
          </p>

          {/* Authenticated Google User Chip */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--surface-variant)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px',
            }}
          >
            {user.photoURL && !imgError ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={() => setImgError(true)}
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  display: 'block',
                  border: '1px solid var(--border-subtle)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1a73e8, #4285f4)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                maxWidth: '220px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.displayName || user.email}
            </span>
          </div>

          {/* Lockout Warning Banner */}
          {isLockedOut && (
            <div
              style={{
                background: 'var(--accent-rose-subtle)',
                border: '1px solid rgba(179, 38, 30, 0.3)',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--accent-rose)',
                textAlign: 'left',
              }}
            >
              <AlertTriangle size={18} className="shrink-0" />
              <div style={{ fontSize: '12px' }}>
                <strong>Account Lockout Active:</strong> Please wait <strong>{lockoutSeconds}s</strong>.
              </div>
            </div>
          )}

          {/* 6-Digit PIN Indicators with Shake Animation */}
          <div
            onClick={() => inputRef.current?.focus()}
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '14px',
              margin: '16px 0 26px',
              transform: isShaking ? 'translateX(-8px)' : 'none',
              transition: isShaking ? 'transform 0.08s ease' : 'all 0.2s ease',
              cursor: 'text',
              padding: '8px',
            }}
          >
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const isFilled = pin.length > index;
              return (
                <div
                  key={index}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: isFilled
                      ? 'var(--accent-blue)'
                      : isShaking
                      ? 'var(--accent-rose)'
                      : 'var(--border)',
                    backgroundColor: isFilled ? 'var(--accent-blue)' : 'transparent',
                    boxShadow: isFilled ? '0 0 10px rgba(26, 115, 232, 0.5)' : 'none',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              );
            })}
          </div>

          {/* Numeric Keypad Grid (3x4) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              maxWidth: '280px',
              margin: '0 auto 24px',
            }}
          >
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDigitClick(digit);
                }}
                disabled={isLockedOut}
                style={{
                  height: '54px',
                  borderRadius: '16px',
                  background: 'var(--surface-variant)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '20px',
                  fontWeight: 600,
                  cursor: isLockedOut ? 'not-allowed' : 'pointer',
                  opacity: isLockedOut ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isLockedOut) e.currentTarget.style.borderColor = 'var(--accent-blue)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                {digit}
              </button>
            ))}

            {/* Bottom Row: Clear (C), 0, Backspace */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                try { vaultAudio.playKeyClick(); } catch {}
                setPin('');
                inputRef.current?.focus();
              }}
              disabled={isLockedOut || pin.length === 0}
              style={{
                height: '54px',
                borderRadius: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: isLockedOut || pin.length === 0 ? 'not-allowed' : 'pointer',
                opacity: isLockedOut || pin.length === 0 ? 0.4 : 1,
              }}
            >
              CLEAR
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDigitClick('0');
              }}
              disabled={isLockedOut}
              style={{
                height: '54px',
                borderRadius: '16px',
                background: 'var(--surface-variant)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '20px',
                fontWeight: 600,
                cursor: isLockedOut ? 'not-allowed' : 'pointer',
                opacity: isLockedOut ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => {
                if (!isLockedOut) e.currentTarget.style.borderColor = 'var(--accent-blue)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              0
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick();
              }}
              disabled={isLockedOut || pin.length === 0}
              style={{
                height: '54px',
                borderRadius: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isLockedOut || pin.length === 0 ? 'not-allowed' : 'pointer',
                opacity: isLockedOut || pin.length === 0 ? 0.4 : 1,
              }}
              title="Delete"
            >
              <Delete size={20} />
            </button>
          </div>

          {/* Switch Account / Sign Out Link */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSignOut();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-blue)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <LogOut size={14} />
              <span>Switch Google Account / Sign Out</span>
            </button>
          </div>
        </div>

        {/* Security Shield Footer Tag */}
        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--text-dim)',
          }}
        >
          <Shield size={13} style={{ color: 'var(--accent-emerald)' }} />
          <span>Zero-Knowledge Protected Vault Gate Active</span>
        </div>
      </div>
    </div>
  );
};
