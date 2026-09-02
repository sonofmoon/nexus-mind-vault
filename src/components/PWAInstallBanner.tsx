import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user dismissed recently
      const dismissed = localStorage.getItem('nexus_pwa_dismissed');
      if (!dismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('nexus_pwa_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        maxWidth: '360px',
        width: 'calc(100% - 40px)',
        background: 'var(--bg-card, #1e293b)',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        padding: '16px',
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
              Install Nexus Mind Vault
            </h4>
            <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
              Fast offline access & native app feel
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1, padding: '8px', fontSize: '12px' }}
          onClick={handleDismiss}
        >
          Not Now
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', fontSize: '12px' }}
          onClick={handleInstall}
        >
          <Download className="w-4 h-4" />
          Install App
        </button>
      </div>
    </div>
  );
};
