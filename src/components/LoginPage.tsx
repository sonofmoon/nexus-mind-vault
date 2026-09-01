import React, { useState, useEffect } from 'react';
import { UserSession } from '../types';
import { signInWithGoogle } from '../services/authService';
import { NexusMindVaultLogo } from './NexusMindVaultLogo';
import { Shield, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface LoginPageProps {
  onSignInSuccess: (user: UserSession) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSignInSuccess, showToast }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Handle Lockout countdown
  useEffect(() => {
    if (lockoutTimer > 0) {
      const timer = setInterval(() => {
        setLockoutTimer((prev) => {
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
  }, [lockoutTimer]);

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    if (isLockedOut) {
      showToast(`Account lockout active. Wait ${lockoutTimer}s.`, 'error');
      return;
    }

    setIsLoading(true);
    try {
      const user = await signInWithGoogle();
      showToast(`Welcome! Authenticated via Google Identity: ${user.email}`, 'success');
      onSignInSuccess(user);
    } catch (err: any) {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);
      if (nextFailures >= 5) {
        setIsLockedOut(true);
        setLockoutTimer(30);
        showToast("Lockout triggered! Suspicious activity blocked for 30s.", "error");
      } else {
        showToast(err.message || "Google Authentication failed", 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        background: 'var(--bg-main)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text-primary)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient Subtle Glow */}
      <div
        style={{
          position: 'absolute',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(26, 115, 232, 0.06) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1 }}>
        {/* Outer Google Material 3 Card Container */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: '24px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-elevated)',
            padding: '40px 36px',
            position: 'relative',
          }}
        >
          {/* Header Brand */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <NexusMindVaultLogo height={44} />
            </div>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 600,
                margin: '0 0 6px 0',
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              Sign in
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              to continue to Nexus Mind Vault
            </p>
          </div>

          {/* Account Lockout Banner */}
          {isLockedOut && (
            <div
              style={{
                background: 'var(--accent-rose-subtle)',
                border: '1px solid rgba(179, 38, 30, 0.3)',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: 'var(--accent-rose)',
              }}
            >
              <AlertTriangle size={18} className="shrink-0" />
              <div style={{ fontSize: '12.5px' }}>
                <strong>Account Lockout Active:</strong> Authentication blocked for <strong>{lockoutTimer} seconds</strong>.
              </div>
            </div>
          )}

          {/* Google Identity Sign-In Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isLockedOut}
              className="google-signin-btn"
              style={{
                width: '100%',
                height: '48px',
                borderRadius: 'var(--radius-pill)',
                opacity: isLoading || isLockedOut ? 0.6 : 1,
                cursor: isLoading || isLockedOut ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                fontSize: '14.5px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin text-blue-500" />
                  <span>Connecting to Google Identity...</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>
          </div>

          {/* Security Guarantee Badges */}
          <div
            style={{
              marginTop: '28px',
              paddingTop: '18px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <Shield size={14} className="text-emerald-500 shrink-0" />
              <span>Zero-Knowledge Vault</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={14} className="text-blue-500 shrink-0" />
              <span>Isolated Firestore</span>
            </div>
          </div>
        </div>

        {/* Minimal Google-Style Footer */}
        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px',
            fontSize: '12px',
            color: 'var(--text-dim)',
          }}
        >
          <span>English (United States)</span>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Help</span>
            <span>Privacy</span>
            <span>Terms</span>
          </div>
        </div>
      </div>
    </div>
  );
};
