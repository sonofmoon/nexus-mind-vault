import React, { useState } from 'react';
import { PinBoxGroup } from './PinBoxGroup';
import { NexusMindVaultLogo } from './NexusMindVaultLogo';
import { Shield, KeyRound, Lock, CheckCircle2, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';

interface FirstTimeSetupModalProps {
  isOpen: boolean;
  onComplete: (pin: string, secret: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const FirstTimeSetupModal: React.FC<FirstTimeSetupModalProps> = ({
  isOpen,
  onComplete,
  showToast,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [pinDigits, setPinDigits] = useState<string[]>(Array(6).fill(''));
  const [confirmPinDigits, setConfirmPinDigits] = useState<string[]>(Array(6).fill(''));
  
  const [secret, setSecret] = useState('');
  const [confirmSecret, setConfirmSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [showConfirmSecret, setShowConfirmSecret] = useState(false);

  const [pinInvalid, setPinInvalid] = useState(false);
  const [confirmPinInvalid, setConfirmPinInvalid] = useState(false);

  if (!isOpen) return null;

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setPinInvalid(false);
    setConfirmPinInvalid(false);

    const pin = pinDigits.join('');
    const confirmPin = confirmPinDigits.join('');

    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setPinInvalid(true);
      showToast("PIN must be exactly 6 digits (0-9).", "error");
      return;
    }

    if (pin !== confirmPin) {
      setConfirmPinInvalid(true);
      showToast("PIN confirmation does not match. Please re-enter your 6-digit PIN.", "error");
      return;
    }

    setStep(2);
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!secret.trim()) {
      showToast("Secret Code is required.", "error");
      return;
    }

    if (secret.trim() !== confirmSecret.trim()) {
      showToast("Secret Code confirmation does not match.", "error");
      return;
    }

    const pin = pinDigits.join('');
    onComplete(pin, secret.trim());
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(32, 33, 36, 0.65)',
        backdropFilter: 'blur(6px)',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#ffffff',
          borderRadius: '28px',
          boxShadow: '0 12px 32px 0 rgba(60, 64, 67, 0.2), 0 2px 6px 0 rgba(60, 64, 67, 0.1)',
          border: '1px solid #dadce0',
          overflow: 'hidden',
          fontFamily: 'Roboto, "Google Sans", -apple-system, BlinkMacSystemFont, sans-serif',
          color: '#202124'
        }}
      >
        {/* Google Security Header */}
        <div style={{ padding: '36px 32px 20px 32px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <NexusMindVaultLogo height={42} />
          </div>

          <h2
            style={{
              fontSize: '22px',
              fontWeight: 500,
              margin: '0 0 8px 0',
              color: '#202124',
              letterSpacing: '-0.01em'
            }}
          >
            First-Time Security Setup
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: '#5f6368',
              margin: 0,
              lineHeight: '1.5'
            }}
          >
            Configure your dual-layer security credentials to protect your Neural Vault sessions.
          </p>

          {/* Google Step Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginTop: '20px'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 500,
                color: step === 1 ? '#1a73e8' : '#3c4043',
                backgroundColor: step === 1 ? '#e8f0fe' : '#f1f3f4',
                padding: '6px 14px',
                borderRadius: '16px'
              }}
            >
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: step === 1 ? '#1a73e8' : '#5f6368',
                  color: 'var(--text-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                1
              </span>
              <span>6-Digit PIN</span>
            </div>

            <div
              style={{
                width: '24px',
                height: '2px',
                backgroundColor: step === 2 ? '#1a73e8' : '#dadce0'
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 500,
                color: step === 2 ? '#1a73e8' : '#5f6368',
                backgroundColor: step === 2 ? '#e8f0fe' : '#f1f3f4',
                padding: '6px 14px',
                borderRadius: '16px'
              }}
            >
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: step === 2 ? '#1a73e8' : '#80868b',
                  color: 'var(--text-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                2
              </span>
              <span>Secret Code</span>
            </div>
          </div>
        </div>

        {/* Step Body */}
        <div style={{ padding: '0 32px 32px 32px' }}>
          {step === 1 ? (
            <form onSubmit={handleNextStep} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#3c4043',
                    marginBottom: '8px'
                  }}
                >
                  <KeyRound size={16} style={{ color: '#1a73e8' }} />
                  Create 6-Digit Vault PIN
                </label>
                <PinBoxGroup
                  digits={pinDigits}
                  onChange={setPinDigits}
                  isInvalid={pinInvalid}
                  ariaLabelPrefix="Create PIN digit"
                />
                <span style={{ fontSize: '12px', color: '#5f6368', display: 'block', marginTop: '6px' }}>
                  Must be exactly 6 numeric digits (0-9).
                </span>
              </div>

              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#3c4043',
                    marginBottom: '8px'
                  }}
                >
                  <CheckCircle2 size={16} style={{ color: '#137333' }} />
                  Confirm 6-Digit Vault PIN
                </label>
                <PinBoxGroup
                  digits={confirmPinDigits}
                  onChange={setConfirmPinDigits}
                  isInvalid={confirmPinInvalid}
                  ariaLabelPrefix="Confirm PIN digit"
                />
              </div>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  style={{
                    height: '44px',
                    padding: '0 24px',
                    borderRadius: '22px',
                    backgroundColor: '#1a73e8',
                    color: 'var(--text-primary)',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(60, 64, 67, 0.3)',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1557b0')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#1a73e8')}
                >
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFinalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label
                  htmlFor="setup-secret"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#3c4043',
                    marginBottom: '8px'
                  }}
                >
                  <Lock size={16} style={{ color: '#f29900' }} />
                  Create Secondary Security Code
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    id="setup-secret"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="e.g. nexus-protocol-99"
                    required
                    style={{
                      width: '100%',
                      height: '48px',
                      padding: '0 44px 0 16px',
                      borderRadius: '12px',
                      border: '1px solid #dadce0',
                      backgroundColor: '#f8f9fa',
                      fontSize: '14px',
                      color: '#202124',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#1a73e8';
                      e.target.style.backgroundColor = '#ffffff';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#dadce0';
                      e.target.style.backgroundColor = '#f8f9fa';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#5f6368',
                      cursor: 'pointer'
                    }}
                  >
                    {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <span style={{ fontSize: '12px', color: '#5f6368', display: 'block', marginTop: '6px' }}>
                  Secondary security phrase for identity verification and account protection.
                </span>
              </div>

              <div>
                <label
                  htmlFor="setup-secret-confirm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#3c4043',
                    marginBottom: '8px'
                  }}
                >
                  <CheckCircle2 size={16} style={{ color: '#137333' }} />
                  Confirm Secret Transition Code
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmSecret ? 'text' : 'password'}
                    id="setup-secret-confirm"
                    value={confirmSecret}
                    onChange={(e) => setConfirmSecret(e.target.value)}
                    placeholder="Re-enter secret code"
                    required
                    style={{
                      width: '100%',
                      height: '48px',
                      padding: '0 44px 0 16px',
                      borderRadius: '12px',
                      border: '1px solid #dadce0',
                      backgroundColor: '#f8f9fa',
                      fontSize: '14px',
                      color: '#202124',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#1a73e8';
                      e.target.style.backgroundColor = '#ffffff';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#dadce0';
                      e.target.style.backgroundColor = '#f8f9fa';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmSecret(!showConfirmSecret)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#5f6368',
                      cursor: 'pointer'
                    }}
                  >
                    {showConfirmSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    height: '44px',
                    padding: '0 20px',
                    borderRadius: '22px',
                    backgroundColor: 'transparent',
                    color: '#1a73e8',
                    border: '1px solid #dadce0',
                    fontSize: '14px',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  style={{
                    height: '44px',
                    padding: '0 24px',
                    borderRadius: '22px',
                    backgroundColor: '#1a73e8',
                    color: 'var(--text-primary)',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(60, 64, 67, 0.3)',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1557b0')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#1a73e8')}
                >
                  <span>Complete Setup & Enter Vault</span>
                </button>
              </div>
            </form>
          )}

          {/* Footer Security Guarantee */}
          <div
            style={{
              marginTop: '28px',
              paddingTop: '16px',
              borderTop: '1px solid #f1f3f4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#5f6368'
            }}
          >
            <Shield size={14} style={{ color: '#137333' }} />
            <span>End-to-End Client Encryption & Zero-Knowledge Key Isolation</span>
          </div>
        </div>
      </div>
    </div>
  );
};
