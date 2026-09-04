import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('pwa_prompt_dismissed') === 'true';
  });

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log('[PWA] Nexus Mind Vault installed successfully.');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [isDismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <aside
      id="pwa-install-banner"
      className="pwa-install-banner fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg shadow-2xl transition-all duration-300"
      style={{
        background: 'var(--bg-card, #0f172a)',
        border: '1px solid var(--accent-purple, #8b5cf6)',
        borderRadius: '16px',
        padding: '14px 18px',
        color: 'var(--text-primary, #ffffff)',
        boxShadow: '0 8px 32px rgba(103, 80, 164, 0.35)',
        backdropFilter: 'blur(12px)',
      }}
      role="region"
      aria-label="PWA Installation Banner"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6750a4, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>Install Nexus Mind Vault</strong>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  background: 'rgba(139, 92, 246, 0.2)',
                  color: '#a78bfa',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                }}
              >
                PWA
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', margin: '2px 0 0 0', lineHeight: 1.3 }}>
              Install for instant offline reflections and zero-latency vault access.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleInstall}
            className="google-btn-primary"
            style={{
              background: 'linear-gradient(135deg, #6750a4, #7c3aed)',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '12px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.4)',
            }}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install banner"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
