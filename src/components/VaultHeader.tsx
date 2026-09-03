import React, { useRef } from 'react';
import { UserSession, VaultMode, TabType } from '../types';
import { Shield, ShieldCheck, Lock, Unlock, LogIn, LogOut, BookOpen, BarChart2, Cpu, Clock, Settings, Share2, Network, Sun, Moon, Search, Command } from 'lucide-react';
import { NexusMindVaultLogo } from './NexusMindVaultLogo';

interface VaultHeaderProps {
  user: UserSession | null;
  vaultMode: VaultMode;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenUnlockModal: () => void;
  onLockVault: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  isConfigured: boolean;
  onOpenSetupModal: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenCommandPalette?: () => void;
  isDuressActive?: boolean;
  isPVUnlocked?: boolean;
}

export const VaultHeader: React.FC<VaultHeaderProps> = ({
  user,
  vaultMode,
  activeTab,
  onTabChange,
  onOpenUnlockModal,
  onLockVault,
  onSignIn,
  onSignOut,
  isConfigured,
  onOpenSetupModal,
  theme,
  onToggleTheme,
  onOpenCommandPalette,
  isDuressActive = false,
  isPVUnlocked = false,
}) => {
  const longPressTimerRef = useRef<any>(null);
  const [isHolding, setIsHolding] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [user?.photoURL]);

  const handlePressStart = () => {
    // 🛡️ Dual-Mode Security Directives:
    // 1. Secret Gate is COMPLETELY AIR-GAPPED when Protected Vault is locked (!isPVUnlocked)
    // 2. Secret Gate is SILENTLY NEUTRALIZED under Duress Protocol (isDuressActive)
    if (!isPVUnlocked || isDuressActive) {
      return;
    }

    if (vaultMode === 'protected') {
      setIsHolding(true);
      longPressTimerRef.current = setTimeout(() => {
        setIsHolding(false);
        if (!isConfigured) {
          onOpenSetupModal();
        } else {
          onOpenUnlockModal();
        }
      }, 750);
    }
  };

  const handlePressEnd = () => {
    setIsHolding(false);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  return (
    <header className={`vault-header ${vaultMode === 'real' ? 'vault-header-nmv' : 'vault-header-pv'}`}>
      {/* Brand & Status Section */}
      <div className="brand-section">
        {/* Brand Logo - Secret Gate for Real Vault (Completely covert: no hover hints, no cursor change, no visual holding state) */}
        <div
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'default',
            userSelect: 'none',
            padding: '4px 8px',
            borderRadius: '16px',
            backgroundColor: 'transparent',
            outline: 'none',
          }}
        >
          <NexusMindVaultLogo height={34} />
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {vaultMode === 'real' ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(26, 115, 232, 0.15)',
                  border: '1.5px solid rgba(26, 115, 232, 0.4)',
                  fontSize: '11.5px',
                  color: 'var(--text-main)',
                  fontWeight: 700,
                }}
              >
                <Unlock className="w-3.5 h-3.5 text-blue-500" />
                <span>Real Vault Unlocked</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--accent-emerald-subtle)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  fontSize: '11px',
                  color: 'var(--accent-emerald)',
                  fontWeight: 600,
                  userSelect: 'none',
                }}
                title="Security Status: Active Protection"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Protected Mode</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Tabs (Rendered ONLY when user is authenticated) */}
      {user && (
        <div className="vault-header-nav-container hidden md:flex">
          <nav
            className="vault-header-nav"
            style={{
              gap: '4px',
              background: 'var(--bg-sidebar)',
              padding: '3px 6px',
              border: '1px solid var(--border-subtle)',
            }}
          >
          {/* Item 1: 📝 Journal */}
          <button
            type="button"
            className="btn"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: activeTab === 'journal' ? 600 : 500,
              borderRadius: 'var(--radius-pill)',
              background: activeTab === 'journal' ? 'var(--blue)' : 'transparent',
              color: activeTab === 'journal' ? '#ffffff' : 'var(--text-secondary)',
              border: activeTab === 'journal' ? 'none' : '1px solid transparent',
              boxShadow: activeTab === 'journal' ? '0 1px 3px rgba(60,64,67,0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
            onClick={() => onTabChange('journal')}
          >
            <BookOpen className={`w-3.5 h-3.5 inline mr-1 ${activeTab === 'journal' ? 'text-white' : 'text-blue-500'}`} />
            <span>Journal</span>
          </button>

          {/* Item 2: 📈 Insights */}
          <button
            type="button"
            className="btn"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: activeTab === 'insights' ? 600 : 500,
              borderRadius: 'var(--radius-pill)',
              background: activeTab === 'insights' ? 'var(--blue)' : 'transparent',
              color: activeTab === 'insights' ? '#ffffff' : 'var(--text-secondary)',
              border: activeTab === 'insights' ? 'none' : '1px solid transparent',
              boxShadow: activeTab === 'insights' ? '0 1px 3px rgba(60,64,67,0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
            onClick={() => onTabChange('insights')}
          >
            <BarChart2 className={`w-3.5 h-3.5 inline mr-1 ${activeTab === 'insights' ? 'text-white' : 'text-emerald-500'}`} />
            <span>Insights</span>
          </button>

          {/* Protected Vault Parallel Persona Graph Tab */}
          {vaultMode === 'protected' && (
            <button
              type="button"
              className="btn"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: (activeTab === 'graph' || activeTab === 'nexus') ? 600 : 500,
                borderRadius: 'var(--radius-pill)',
                background: (activeTab === 'graph' || activeTab === 'nexus') ? 'var(--blue)' : 'transparent',
                color: (activeTab === 'graph' || activeTab === 'nexus') ? '#ffffff' : 'var(--text-secondary)',
                border: (activeTab === 'graph' || activeTab === 'nexus') ? 'none' : '1px solid transparent',
                boxShadow: (activeTab === 'graph' || activeTab === 'nexus') ? '0 1px 3px rgba(60,64,67,0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
              onClick={() => onTabChange('graph')}
            >
              <Share2 className={`w-3.5 h-3.5 inline mr-1 ${(activeTab === 'graph' || activeTab === 'nexus') ? 'text-white' : 'text-emerald-500'}`} />
              <span>Semantic Web</span>
            </button>
          )}

          {/* NMV Exclusive Tabs (Real Mode Only) */}
          {vaultMode === 'real' && (
            <>
              {/* Item 3: 🕸️ Memory Graph */}
              <button
                type="button"
                className="btn"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: (activeTab === 'graph' || activeTab === 'nexus') ? 600 : 500,
                  borderRadius: 'var(--radius-pill)',
                  background: (activeTab === 'graph' || activeTab === 'nexus') ? 'var(--blue)' : 'transparent',
                  color: (activeTab === 'graph' || activeTab === 'nexus') ? '#ffffff' : 'var(--text-secondary)',
                  border: (activeTab === 'graph' || activeTab === 'nexus') ? 'none' : '1px solid transparent',
                  boxShadow: (activeTab === 'graph' || activeTab === 'nexus') ? '0 1px 3px rgba(60,64,67,0.3)' : 'none',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => onTabChange('graph')}
              >
                <Share2 className={`w-3.5 h-3.5 inline mr-1 ${(activeTab === 'graph' || activeTab === 'nexus') ? 'text-white' : 'text-purple-400'}`} />
                <span>Memory Graph</span>
              </button>

              {/* Item 4: ⏳ Future Capsules */}
              <button
                type="button"
                className="btn"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: activeTab === 'capsules' ? 600 : 500,
                  borderRadius: 'var(--radius-pill)',
                  background: activeTab === 'capsules' ? 'var(--blue)' : 'transparent',
                  color: activeTab === 'capsules' ? '#ffffff' : 'var(--text-secondary)',
                  border: activeTab === 'capsules' ? 'none' : '1px solid transparent',
                  boxShadow: activeTab === 'capsules' ? '0 1px 3px rgba(60,64,67,0.3)' : 'none',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => onTabChange('capsules')}
              >
                <Clock className={`w-3.5 h-3.5 inline mr-1 ${activeTab === 'capsules' ? 'text-white' : 'text-amber-400'}`} />
                <span>Future Capsules</span>
              </button>

              {/* Item 5: ⚙️ Vault Settings */}
              <button
                type="button"
                className="btn"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: activeTab === 'settings' ? 600 : 500,
                  borderRadius: 'var(--radius-pill)',
                  background: activeTab === 'settings' ? 'var(--blue)' : 'transparent',
                  color: activeTab === 'settings' ? '#ffffff' : 'var(--text-secondary)',
                  border: activeTab === 'settings' ? 'none' : '1px solid transparent',
                  boxShadow: activeTab === 'settings' ? '0 1px 3px rgba(60,64,67,0.3)' : 'none',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => onTabChange('settings')}
              >
                <Settings className={`w-3.5 h-3.5 inline mr-1 ${activeTab === 'settings' ? 'text-white' : 'text-sky-400'}`} />
                <span>Vault Settings</span>
              </button>
            </>
          )}
        </nav>
        </div>
      )}

      {/* Theme Toggle & Auth Actions */}
      <div className="vault-header-auth" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Command Palette Trigger Button (Only shown when authenticated) */}
        {user && onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Search & Command Palette (Ctrl+K / ⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Commands</span>
            <kbd className="shortcut-key hidden sm:inline-flex">Ctrl K</kbd>
          </button>
        )}

        {/* Global Theme Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="btn btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: 'var(--radius-pill)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title={theme === 'dark' ? 'Switch to System Light Mode' : 'Switch to Security Dark Mode'}
        >
          {theme === 'dark' ? (
            <>
              <Moon className="w-3.5 h-3.5" style={{ color: '#c084fc' }} />
              <span className="hidden sm:inline">Security Dark</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5" style={{ color: '#eab308' }} />
              <span className="hidden sm:inline">System Light</span>
            </>
          )}
        </button>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user.photoURL && !imgError ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={() => setImgError(true)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1.5px solid var(--border-subtle)',
                    display: 'block',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1a73e8, #4285f4)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: '1.5px solid var(--border-subtle)',
                  }}
                >
                  {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <span className="user-display-name" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {user.displayName}
              </span>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="btn btn-secondary"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 mr-1 inline" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>

    </header>
  );
};
