import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TabType, VaultMode, JournalEntry } from '../types';
import {
  Search,
  BookOpen,
  BarChart2,
  Share2,
  Clock,
  Settings,
  Moon,
  Sun,
  Plus,
  Lock,
  Unlock,
  Sparkles,
  Command,
  ArrowRight,
  Radio,
} from 'lucide-react';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultMode: VaultMode;
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  entries: JournalEntry[];
  onSelectEntry?: (entry: JournalEntry) => void;
  onOpenUnlockModal: () => void;
  onLockVault: () => void;
  onPanicPurge?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onNewEntry?: () => void;
  isDuressActive?: boolean;
}

interface CommandItem {
  id: string;
  category: 'Navigation' | 'Actions' | 'Entries';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  vaultMode,
  onSelectTab,
  entries,
  onSelectEntry,
  onOpenUnlockModal,
  onLockVault,
  onPanicPurge,
  theme,
  onToggleTheme,
  onNewEntry,
  isDuressActive = false,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const allCommands = useMemo(() => {
    const items: CommandItem[] = [];

    // 1. Navigation items
    items.push({
      id: 'nav_journal',
      category: 'Navigation',
      title: vaultMode === 'real' ? 'Open Neural Journal Reflections' : 'Open Field Observations & Logs',
      subtitle: vaultMode === 'real' ? 'View and compose daily encrypted thoughts' : 'View and record field observations',
      icon: <BookOpen className="w-4 h-4 text-blue-400" />,
      shortcut: 'J',
      action: () => {
        onSelectTab('journal');
        onClose();
      },
    });

    items.push({
      id: 'nav_insights',
      category: 'Navigation',
      title: vaultMode === 'real' ? 'Open Cognitive Insights & AI Trends' : 'Open Analytical Insights & Metrics',
      subtitle: vaultMode === 'real' ? 'AI trend analysis, mood telemetry & patterns' : 'Statistical growth charts & telemetry metrics',
      icon: <BarChart2 className="w-4 h-4 text-emerald-400" />,
      shortcut: 'I',
      action: () => {
        onSelectTab('insights');
        onClose();
      },
    });

    items.push({
      id: 'nav_graph',
      category: 'Navigation',
      title: vaultMode === 'real' ? 'Open Semantic Memory Graph' : 'Open Botanical Knowledge Web',
      subtitle: vaultMode === 'real' ? 'Explore neural memory nodes and connections' : 'Inspect cover domain concept map',
      icon: <Share2 className="w-4 h-4 text-purple-400" />,
      shortcut: 'G',
      action: () => {
        onSelectTab('graph');
        onClose();
      },
    });

    if (vaultMode === 'real') {
      items.push({
        id: 'nav_voice',
        category: 'Navigation',
        title: 'Open Nexura AI (Sovereign Voice Sanctuary)',
        subtitle: 'Hands-free bi-directional AI voice dialogue with live resonance orb',
        icon: <Radio className="w-4 h-4 text-purple-400 animate-pulse" />,
        shortcut: 'Ctrl+M',
        action: () => {
          onSelectTab('voice');
          onClose();
        },
      });

      items.push({
        id: 'nav_capsules',
        category: 'Navigation',
        title: 'Open Future Capsules & Legacy Guardian Protocol',
        subtitle: 'Manage future self capsules and emergency pulses',
        icon: <Clock className="w-4 h-4 text-amber-400" />,
        shortcut: 'C',
        action: () => {
          onSelectTab('capsules');
          onClose();
        },
      });

      items.push({
        id: 'nav_settings',
        category: 'Navigation',
        title: 'Open Vault Settings & Credentials',
        subtitle: 'Configure zero-trust keys, PINs and backups',
        icon: <Settings className="w-4 h-4 text-sky-400" />,
        shortcut: 'S',
        action: () => {
          onSelectTab('settings');
          onClose();
        },
      });
    }

    // 2. Actions items
    if (onNewEntry) {
      items.push({
        id: 'act_new_entry',
        category: 'Actions',
        title: vaultMode === 'real' ? 'Compose New Reflection' : 'Compose New Observation',
        subtitle: vaultMode === 'real' ? 'Start a new encrypted journal entry' : 'Record a new field log entry',
        icon: <Plus className="w-4 h-4 text-blue-500" />,
        shortcut: 'N',
        action: () => {
          onSelectTab('journal');
          onNewEntry();
          onClose();
        },
      });
    }

    items.push({
      id: 'act_theme',
      category: 'Actions',
      title: theme === 'dark' ? 'Switch to System Light Mode' : 'Switch to Security Dark Mode',
      subtitle: 'Toggle theme display mode',
      icon: theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-purple-400" />,
      shortcut: 'T',
      action: () => {
        onToggleTheme();
        onClose();
      },
    });

    if (vaultMode === 'protected' && !isDuressActive) {
      // Covert trigger in Protected Mode: looks like a benign node diagnostics tool
      items.push({
        id: 'act_sync_diagnostics',
        category: 'Actions',
        title: 'Check FloraDB Node Synchronization',
        subtitle: 'Inspect local node registry & schema status',
        icon: <Sparkles className="w-4 h-4 text-purple-400" />,
        action: () => {
          onClose();
          onOpenUnlockModal();
        },
      });
    } else if (vaultMode === 'real') {
      items.push({
        id: 'act_panic_purge',
        category: 'Actions',
        title: '⚡ Panic Purge (Emergency Duress Trap)',
        subtitle: 'Instantly deploy Cover Decoy and air-gap the Secret Gate',
        icon: <Lock className="w-4 h-4 text-red-500" />,
        shortcut: 'P',
        action: () => {
          if (onPanicPurge) onPanicPurge();
          else onLockVault();
          onClose();
        },
      });

      items.push({
        id: 'act_lock',
        category: 'Actions',
        title: 'Lock Vault (Return to Protected Mode)',
        subtitle: 'Conceal confidential partitions instantly',
        icon: <Lock className="w-4 h-4 text-red-400" />,
        shortcut: 'L',
        action: () => {
          onLockVault();
          onClose();
        },
      });
    }

    // 3. Entries Search List (Only searches active entries)
    entries.slice(0, 15).forEach((entry) => {
      items.push({
        id: 'entry_' + entry.id,
        category: 'Entries',
        title: entry.title,
        subtitle: (entry.mood ? '[' + entry.mood.toUpperCase() + '] ' : '') + entry.content.slice(0, 70) + '...',
        icon: <BookOpen className="w-3.5 h-3.5 text-slate-400" />,
        action: () => {
          onSelectTab('journal');
          if (onSelectEntry) onSelectEntry(entry);
          onClose();
        },
      });
    });

    return items;
  }, [vaultMode, theme, entries, onSelectTab, onSelectEntry, onOpenUnlockModal, onLockVault, onToggleTheme, onNewEntry, onClose]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase();
    return allCommands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) ||
        cmd.category.toLowerCase().includes(q)
    );
  }, [allCommands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-index="' + selectedIndex + '"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(5, 8, 18, 0.75)',
        backdropFilter: 'blur(10px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        paddingLeft: '16px',
        paddingRight: '16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '600px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(26, 115, 232, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
          }}
        >
          <Search className="w-5 h-5 text-blue-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              vaultMode === 'real'
                ? 'Type a command, jump to tab, or search reflections...'
                : 'Type a command, jump to tab, or search observations...'
            }
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <kbd className="shortcut-key">ESC</kbd>
        </div>

        <div
          ref={listRef}
          style={{
            maxHeight: '380px',
            overflowY: 'auto',
            padding: '8px',
            background: 'var(--bg-main)',
          }}
        >
          {filteredCommands.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Command className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p style={{ fontSize: '13px', margin: 0 }}>
                {vaultMode === 'real'
                  ? 'No matching commands or reflections found.'
                  : 'No matching commands or field logs found.'}
              </p>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  data-index={idx}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--accent-blue-subtle)' : 'transparent',
                    border: isSelected ? '1px solid var(--accent-blue-glow)' : '1px solid transparent',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: isSelected ? 'var(--bg-card)' : 'var(--bg-sidebar)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {cmd.icon}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 600,
                          color: isSelected ? 'var(--blue)' : 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {cmd.title}
                      </div>
                      {cmd.subtitle && (
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '1px',
                          }}
                        >
                          {cmd.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px', flexShrink: 0 }}>
                    {cmd.shortcut && <kbd className="shortcut-key">{cmd.shortcut}</kbd>}
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-blue-500" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>
              <kbd className="shortcut-key">↑</kbd> <kbd className="shortcut-key">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="shortcut-key">↵</kbd> Select
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>{vaultMode === 'real' ? 'Nexus Mind Command Core' : 'FloraDB Workspace Core'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

