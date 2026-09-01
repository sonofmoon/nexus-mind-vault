import React, { useState, useEffect } from 'react';
import { JournalEntry, ParallelPersonaData } from '../types';
import { getParallelPersona } from '../services/vaultStorage';
import { SemanticMemoryGraph } from './SemanticMemoryGraph';
import { ShieldCheck, BookOpen, Search, Tag, Calendar, Sparkles, Filter, Info, Eye, Unlock } from 'lucide-react';

interface ProtectedVaultGraphViewProps {
  userId: string;
  onOpenUnlockModal?: () => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const ProtectedVaultGraphView: React.FC<ProtectedVaultGraphViewProps> = ({
  userId,
  onOpenUnlockModal,
  showToast,
}) => {
  const [personaData, setPersonaData] = useState<ParallelPersonaData>(() => getParallelPersona(userId));
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'graph' | 'entries'>('graph');

  // Reload persona if userId changes or persona is updated in real-time
  useEffect(() => {
    const data = getParallelPersona(userId);
    setPersonaData(data);

    const handlePersonaUpdated = (e: any) => {
      if (e.detail?.personaData) {
        setPersonaData(e.detail.personaData);
      } else {
        setPersonaData(getParallelPersona(userId));
      }
    };

    window.addEventListener('vault_persona_updated', handlePersonaUpdated);
    return () => window.removeEventListener('vault_persona_updated', handlePersonaUpdated);
  }, [userId]);

  const filteredEntries = (personaData.entries || []).filter((entry) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.title.toLowerCase().includes(q) ||
      entry.content.toLowerCase().includes(q) ||
      (entry.tags && entry.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }} className="px-3 py-4 sm:px-6 sm:py-6">
      {/* Header Info Banner */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }} className="w-full sm:w-auto">
          <div
            style={{
              width: '40px',
              height: '40px',
              minWidth: '40px',
              borderRadius: '12px',
              background: 'rgba(52, 168, 83, 0.12)',
              border: '1px solid rgba(52, 168, 83, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-emerald)',
            }}
          >
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                  fontFamily: 'var(--font-sans)',
                }}
                className="sm:text-base"
              >
                {personaData.personaTitle || `${personaData.targetDomain} Field Journal`}
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--accent-emerald)',
                  background: 'rgba(52, 168, 83, 0.12)',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  border: '1px solid rgba(52, 168, 83, 0.25)',
                }}
                className="whitespace-nowrap"
              >
                {personaData.targetDomain || 'Cover Persona Active'}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
              Synthesized concept web and field logs for {personaData.targetDomain.toLowerCase()} cover domain.
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-stretch sm:justify-end">
          <div
            className="flex w-full sm:w-auto"
            style={{
              background: 'var(--bg-sidebar)',
              padding: '3px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('graph')}
              className="flex-1 sm:flex-none justify-center min-h-[34px]"
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                background: activeTab === 'graph' ? '#1e8e3e' : 'transparent',
                color: activeTab === 'graph' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Semantic Graph
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('entries')}
              className="flex-1 sm:flex-none justify-center min-h-[34px]"
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                background: activeTab === 'entries' ? '#1e8e3e' : 'transparent',
                color: activeTab === 'entries' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Field Logs ({personaData.entries.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'graph' ? (
        <SemanticMemoryGraph
          entries={personaData.entries}
          initialGraphData={personaData.graph}
          isProtectedVault={true}
          userId={userId}
          showToast={showToast}
        />
      ) : (
        <div>
          {/* Search Bar */}
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${personaData.targetDomain} field logs...`}
              style={{
                width: '100%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                padding: '12px 16px 12px 42px',
                fontSize: '14px',
                color: 'var(--text-primary)', outline: 'none',
              }}
            />
          </div>

          {/* List of Persona Entries */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  padding: '18px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: 'var(--shadow-card)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#34d399',
                      background: 'rgba(16, 185, 129, 0.15)',
                      padding: '2px 8px',
                      borderRadius: '100px',
                    }}
                  >
                    {entry.mood || 'Observation'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                  {entry.title}
                </h3>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    margin: '0 0 12px 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {entry.content}
                </p>
                {entry.tags && entry.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {entry.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '11px',
                          color: '#a7f3d0',
                          background: 'rgba(255,255,255,0.05)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entry Modal Detail */}
      {selectedEntry && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(5, 8, 18, 0.85)',
            backdropFilter: 'blur(12px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-7"
            style={{
              background: 'var(--bg-surface)',
              borderRadius: '24px',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              color: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.15)',
                  padding: '3px 10px',
                  borderRadius: '100px',
                }}
              >
                {selectedEntry.mood || 'Log Entry'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
              {selectedEntry.title}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Logged on {new Date(selectedEntry.createdAt).toLocaleString()}
            </div>
            <div
              style={{
                fontSize: '14px',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '16px',
                borderRadius: '12px',
                maxHeight: '300px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                marginBottom: '16px',
              }}
            >
              {selectedEntry.content}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '10px 20px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                }}
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
