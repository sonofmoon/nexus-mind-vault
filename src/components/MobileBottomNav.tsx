import React from 'react';
import { TabType, VaultMode } from '../types';
import { BookOpen, BarChart2, Share2, Clock, Settings, Radio } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  vaultMode: VaultMode;
  isDuressActive?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  vaultMode,
  isDuressActive = false,
}) => {
  // Tabs configuration based on vaultMode and duress state
  const tabs = React.useMemo(() => {
    if (vaultMode === 'protected') {
      return [
        { id: 'journal' as TabType, label: 'Journal', icon: BookOpen, accent: 'var(--accent-blue)' },
        { id: 'insights' as TabType, label: 'Insights', icon: BarChart2, accent: 'var(--accent-emerald)' },
        { id: 'graph' as TabType, label: 'Semantic Web', icon: Share2, accent: 'var(--accent-purple, #9334e6)' },
      ];
    }

    // Real Vault Mode (NMV)
    const baseTabs = [
      { id: 'journal' as TabType, label: 'Journal', icon: BookOpen, accent: 'var(--accent-blue)' },
      { id: 'voice' as TabType, label: 'Nexura', icon: Radio, accent: '#8b5cf6' },
      { id: 'insights' as TabType, label: 'Insights', icon: BarChart2, accent: 'var(--accent-emerald)' },
      { id: 'graph' as TabType, label: 'Memory Graph', icon: Share2, accent: 'var(--accent-purple, #9334e6)' },
    ];

    if (!isDuressActive) {
      baseTabs.push(
        { id: 'capsules' as TabType, label: 'Capsules', icon: Clock, accent: 'var(--accent-amber)' },
        { id: 'settings' as TabType, label: 'Settings', icon: Settings, accent: 'var(--accent-blue)' }
      );
    }

    return baseTabs;
  }, [vaultMode, isDuressActive]);

  return (
    <nav
      className="mobile-bottom-nav md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '66px',
        paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
        paddingTop: '6px',
        paddingLeft: '8px',
        paddingRight: '8px',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 45,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      aria-label="Mobile Navigation"
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = activeTab === t.id || (t.id === 'graph' && activeTab === 'nexus');
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: '4px 2px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              outline: 'none',
              minHeight: '44px',
              transition: 'all 0.15s ease',
              position: 'relative',
            }}
          >
            {/* Google M3 Active Indicator Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: isActive ? '52px' : '40px',
                height: '28px',
                borderRadius: 'var(--radius-pill)',
                background: isActive ? 'var(--accent-blue-subtle)' : 'transparent',
                color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <Icon className="w-5 h-5" style={{ color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)' }} />
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: '"Google Sans", "Google Sans Text", sans-serif',
                letterSpacing: '-0.01em',
                lineHeight: 1,
                transition: 'color 0.15s ease',
              }}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
