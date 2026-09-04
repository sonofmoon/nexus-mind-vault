import React, { useEffect } from 'react';
import { TabType, VaultMode } from '../types';
import { Radio, Mic } from 'lucide-react';
import { vaultAudio } from '../utils/vaultAudioSynthesizer';

interface GlobalFloatingVoiceOrbProps {
  activeTab: TabType;
  onOpenVoiceMirror: () => void;
  isPVUnlocked: boolean;
  vaultMode?: VaultMode;
}

export const GlobalFloatingVoiceOrb: React.FC<GlobalFloatingVoiceOrbProps> = ({
  activeTab,
  onOpenVoiceMirror,
  isPVUnlocked,
  vaultMode = 'real',
}) => {
  // Global hotkey Ctrl+M or Cmd+M to summon Voice Mirror (Strictly NMV Real Mode only)
  useEffect(() => {
    if (!isPVUnlocked || vaultMode !== 'real') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        vaultAudio.playSuccessChime();
        onOpenVoiceMirror();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPVUnlocked, vaultMode, onOpenVoiceMirror]);

  // Hide floating orb when not in Real NMV mode, already on Voice Mirror tab, or vault is locked
  if (!isPVUnlocked || vaultMode !== 'real' || activeTab === 'voice' || activeTab === 'login') {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 50,
      }}
      className="global-voice-orb-container"
    >
      <button
        type="button"
        onClick={() => {
          vaultAudio.playSuccessChime();
          onOpenVoiceMirror();
        }}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          border: '2px solid rgba(255, 255, 255, 0.25)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 28px rgba(99, 102, 241, 0.45), 0 0 16px rgba(168, 85, 247, 0.35)',
          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          outline: 'none',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 36px rgba(99, 102, 241, 0.6), 0 0 24px rgba(168, 85, 247, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 28px rgba(99, 102, 241, 0.45), 0 0 16px rgba(168, 85, 247, 0.35)';
        }}
        title="Talk with Nexura AI (Ctrl+M)"
        aria-label="Talk with Nexura AI"
      >
        {/* Soft Animated Outer Pulse Ring */}
        <span
          style={{
            position: 'absolute',
            inset: '-4px',
            borderRadius: '50%',
            border: '2px solid rgba(168, 85, 247, 0.5)',
            animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
            pointerEvents: 'none',
          }}
        />

        <Radio className="w-6 h-6 animate-pulse" />
      </button>
    </div>
  );
};
