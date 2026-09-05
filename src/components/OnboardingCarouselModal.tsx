import React, { useState } from 'react';
import { Shield, Lock, EyeOff, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Key, Cpu, Zap } from 'lucide-react';
interface OnboardingCarouselModalProps {
  isOpen: boolean;
  onComplete: () => void;
}
export const OnboardingCarouselModal: React.FC<OnboardingCarouselModalProps> = ({
  isOpen,
  onComplete,
}) => {
  const [slide, setSlide] = useState(0);
  if (!isOpen) return null;
  const slides = [
    {
      icon: <Shield className="w-10 h-10 text-blue-500" />,
      badge: "Zero-Knowledge Architecture",
      title: "Your Sovereign Cognitive Vault",
      description:
        "Nexus Mind Vault encrypts all your reflections, memories, and time capsules directly in your browser using authenticated AES-GCM-256. Plaintext is never transmitted or stored on any cloud server.",
      bulletPoints: [
        "Client-side PBKDF2-SHA-256 key derivation with 600,000 rounds",
        "Unique 96-bit cryptographic nonces (IVs) for every reflection",
        "100% sovereign data ownership with zero third-party tracking",
      ],
      accentColor: "#3b82f6",
    },
    {
      icon: <EyeOff className="w-10 h-10 text-purple-500" />,
      badge: "Anti-Coercion Defense",
      title: "Dual-Mode Plausible Deniability",
      description:
        "Designed to withstand extreme duress. The app contains two separate operational environments: a realistic Protected Safe Decoy and your Sovereign Real Enclave.",
      bulletPoints: [
        "Master PIN opens your Real Enclave with complete reflections",
        "Designated Duress PIN seamlessly displays a benign cover journal",
        "Covert Logo trigger (750ms long-press) hides all visual unlock cues",
      ],
      accentColor: "#a855f7",
    },
    {
      icon: <Key className="w-10 h-10 text-emerald-500" />,
      badge: "Cryptographic Master Key",
      title: "Set Your Sovereign Access Key",
      description:
        "You will now set a 6-digit Master PIN and a Security Passphrase. These values are used to derive your AES-GCM-256 master key in memory.",
      bulletPoints: [
        "Zero-knowledge hash verification - no plaintext storage",
        "Automatic idle memory zeroization with live Security HUD",
        "Hardware biometric support (Touch ID / Windows Hello)",
      ],
      accentColor: "#10b981",
    },
  ];
  const current = slides[slide];
  return (
    <div className="modal-backdrop" style={{ zIndex: 11000 }} role="dialog" aria-modal="true">
      <div
        className="modal-content"
        style={{
          maxWidth: '520px',
          width: '92%',
          padding: '32px',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-elevated)',
          position: 'relative',
        }}
      >
        {/* Step Indicator Bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {slides.map((s, idx) => (
            <div
              key={idx}
              style={{
                height: '4px',
                flex: 1,
                borderRadius: '4px',
                background: idx === slide ? current.accentColor : 'var(--border-subtle)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
        {/* Slide Content */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: `${current.accentColor}18`,
              border: `1px solid ${current.accentColor}33`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
            }}
          >
            {current.icon}
          </div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: current.accentColor,
              background: `${current.accentColor}15`,
              padding: '3px 10px',
              borderRadius: '100px',
              display: 'inline-block',
              marginBottom: '10px',
            }}
          >
            {current.badge}
          </span>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 10px', color: 'var(--text-primary)' }}>
            {current.title}
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 20px' }}>
            {current.description}
          </p>
          <div
            style={{
              background: 'var(--bg-main)',
              borderRadius: '14px',
              padding: '14px 16px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {current.bulletPoints.map((point, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: 'var(--text-primary)' }}>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Navigation Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          {slide > 0 ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSlide(slide - 1)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '10px 18px' }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}
          {slide < slides.length - 1 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setSlide(slide + 1)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '10px 22px' }}
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onComplete}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                padding: '10px 24px',
                background: '#10b981',
                borderColor: '#10b981',
              }}
            >
              <Sparkles className="w-4 h-4" />
              <span>Set Master PIN & Passphrase</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
