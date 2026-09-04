import React from 'react';
import { Keyboard, X, Command } from 'lucide-react';
import { VaultMode } from '../types';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultMode?: VaultMode;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  vaultMode = 'real',
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + K  /  ⌘ + K', desc: 'Open Command Palette' },
    ...(vaultMode === 'real'
      ? [{ key: 'Ctrl + M  /  ⌘ + M', desc: 'Summon Nexura AI Voice Sanctuary' }]
      : []),
    { key: 'Ctrl + N  /  ⌘ + N', desc: 'Jump to New Journal Entry Canvas' },
    { key: 'Ctrl + S  /  ⌘ + S', desc: 'Save Reflection Draft & Sync Vault' },
    { key: 'Escape', desc: 'Close Any Active Modal or Overlay' },
    { key: '?', desc: 'Open This Keyboard Shortcuts Help Modal' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-6 google-card"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 id="shortcuts-title" className="text-base font-bold text-[var(--text-primary)]">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-[var(--text-muted)]">Global Enclave Navigation Hotkeys</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--surface-hover)] text-[var(--text-muted)]"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)]"
            >
              <span className="text-xs text-[var(--text-secondary)] font-medium">{sc.desc}</span>
              <kbd className="px-2 py-1 text-xs font-mono font-semibold rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--accent-blue)] shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-3 border-t border-[var(--border-subtle)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="google-btn-secondary"
            style={{ padding: '6px 18px', fontSize: '12px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
