import React from 'react';
import { ShieldCheck, Lock, EyeOff, Server, HardDrive, CheckCircle2, X } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-title"
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl p-6 sm:p-8 google-card"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 id="privacy-title" className="text-lg font-bold text-[var(--text-primary)]">
                Sovereign Zero-Knowledge Privacy Policy
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                GDPR, CCPA & Cryptographic Transparency Disclosure (v2.0)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--surface-hover)] text-[var(--text-muted)]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 text-sm text-[var(--text-secondary)] leading-relaxed">
          {/* Pillar 1 */}
          <div className="p-4 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
              <Lock className="w-4 h-4 text-blue-500" />
              <span>1. Zero-Knowledge Local-First Encryption</span>
            </div>
            <p className="text-xs">
              All journal entries, time capsules, voice recordings, and tags are encrypted on your physical device using <strong>AES-GCM-256</strong> with keys derived via <strong>PBKDF2 (100,000 iterations)</strong>. Neither our servers nor any third party possesses the cryptographic keys to decrypt your reflections.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="p-4 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
              <EyeOff className="w-4 h-4 text-emerald-500" />
              <span>2. AI Air-Gap Protection & No Training Guarantee</span>
            </div>
            <p className="text-xs">
              When AI Cognitive Mirroring features are active, queries are processed statelessly and discarded immediately after inference. When the <strong>AI Air-Gap</strong> switch is enabled, all external network egress is intercepted locally. Your data is <strong>never used to train public AI models</strong>.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="p-4 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
              <HardDrive className="w-4 h-4 text-purple-500" />
              <span>3. Data Portability & Complete Erasure (GDPR Right to be Forgotten)</span>
            </div>
            <p className="text-xs">
              You own 100% of your data. You may export your entire enclave in standard Markdown (<code>.md</code>), JSON, or CSV formats at any time. Triggering a <strong>Panic Purge</strong> cryptographically shreds all local decryption keys and stored ciphertext instantly.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="p-4 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
              <Server className="w-4 h-4 text-amber-500" />
              <span>4. Zero Tracking & No Ad Networks</span>
            </div>
            <p className="text-xs">
              Nexus Mind Vault contains no third-party analytics trackers, advertising beacons, or surveillance cookies. All logs stored on your device undergo strict automatic redaction.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="google-btn-primary"
            style={{ padding: '8px 24px', fontSize: '13px' }}
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
