import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock, Unlock, Cpu, Zap, Key } from 'lucide-react';
import { vaultAudio } from '../utils/vaultAudioSynthesizer';
interface VaultDecryptionSequenceModalProps {
  isOpen: boolean;
  onComplete: () => void;
}
export const VaultDecryptionSequenceModal: React.FC<VaultDecryptionSequenceModalProps> = ({
  isOpen,
  onComplete,
}) => {
  const [telemetryStep, setTelemetryStep] = useState(0);
  useEffect(() => {
    if (!isOpen) {
      setTelemetryStep(0);
      return;
    }
    // Trigger synthetic audio lock disengagement
    vaultAudio.playUnlockSound();
    // Step progression
    const timer1 = setTimeout(() => setTelemetryStep(1), 220);
    const timer2 = setTimeout(() => setTelemetryStep(2), 550);
    const timer3 = setTimeout(() => setTelemetryStep(3), 850);
    const timer4 = setTimeout(() => setTelemetryStep(4), 1150);
    const timerEnd = setTimeout(() => {
      onComplete();
    }, 1450);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timerEnd);
    };
  }, [isOpen, onComplete]);
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(5, 8, 18, 0.94)',
        backdropFilter: 'blur(20px)',
        zIndex: 100000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        userSelect: 'none',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onComplete}
    >
      {/* Background Cybernetic Pulse Rings */}
      <div
        style={{
          position: 'absolute',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          border: '1px dashed rgba(168, 85, 247, 0.3)',
          animation: 'spin 12s linear infinite',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '480px',
          height: '480px',
          borderRadius: '50%',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          animation: 'spin 18s linear infinite reverse',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(15, 23, 42, 0.96)',
          border: '1px solid rgba(168, 85, 247, 0.5)',
          borderRadius: '24px',
          boxShadow: '0 0 60px rgba(168, 85, 247, 0.35), 0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          padding: '36px 28px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Central Aperture Lock Icon */}
        <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 20px auto' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)',
              animation: 'pulse 1.2s infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid rgba(192, 132, 252, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c084fc',
              background: 'rgba(30, 41, 59, 0.9)',
              boxShadow: '0 0 25px rgba(168, 85, 247, 0.5)',
            }}
          >
            {telemetryStep < 3 ? <Lock className="w-8 h-8 text-purple-400" /> : <Unlock className="w-8 h-8 text-emerald-400" />}
          </div>
        </div>
        {/* Title */}
        <h3
          style={{
            fontSize: '19px',
            fontWeight: 700,
            color: '#ffffff',
            margin: '0 0 4px 0',
            fontFamily: '"Google Sans", "Google Sans Text", sans-serif',
            letterSpacing: '0.02em',
          }}
        >
          {telemetryStep < 3 ? 'Decrypting Sovereign Enclave...' : 'Enclave Authorization Granted'}
        </h3>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 24px 0', fontFamily: 'var(--font-mono)' }}>
          CLIENT-SIDE ZERO-KNOWLEDGE PROTOCOL
        </p>
        {/* Telemetry Stream Lines */}
        <div
          style={{
            background: 'rgba(5, 8, 18, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '14px 16px',
            textAlign: 'left',
            fontFamily: 'var(--font-mono)',
            fontSize: '11.5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minHeight: '120px',
          }}
        >
          {telemetryStep >= 1 && (
            <div style={{ color: '#81c995', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>[+] PBKDF2 SHA-256 (600k Iter) Verified</span>
            </div>
          )}
          {telemetryStep >= 2 && (
            <div style={{ color: '#8ab4f8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>[+] AES-256-GCM Master Key Expanded</span>
            </div>
          )}
          {telemetryStep >= 3 && (
            <div style={{ color: '#c084fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>[+] Nexus Neural Partitions Mounted</span>
            </div>
          )}
          {telemetryStep >= 4 && (
            <div style={{ color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>[+] Sovereign Vault Unlocked * Zero Leakage</span>
            </div>
          )}
        </div>
        {/* Bottom Shimmer Bar */}
        <div style={{ marginTop: '20px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: (telemetryStep * 25) + '%',
              background: 'linear-gradient(90deg, #3b82f6, #a855f7, #10b981)',
              transition: 'width 0.25s ease',
              borderRadius: '2px',
            }}
          />
        </div>
      </div>
    </div>
  );
};
