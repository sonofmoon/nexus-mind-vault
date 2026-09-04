import React, { useState, useEffect, useMemo } from 'react';
import { JournalEntry, ParallelPersonaData } from '../types';
import { getParallelPersona } from '../services/vaultStorage';
import { SemanticMemoryGraph } from './SemanticMemoryGraph';
import {
  ShieldCheck,
  BookOpen,
  Search,
  Tag,
  Calendar,
  Sparkles,
  Filter,
  Info,
  Eye,
  Unlock,
  LayoutGrid,
  LayoutList,
  Network,
  Globe,
  Brain,
  Share2,
  Copy,
  Check,
  X,
} from 'lucide-react';

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
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('all');
  const [viewLayout, setViewLayout] = useState<'list' | 'grid'>('grid');
  const [hasCopiedEntry, setHasCopiedEntry] = useState(false);

  // Extract all distinct domains from persona data
  const allDomains = useMemo(() => {
    const doms = new Set<string>();
    if (Array.isArray((personaData as any).domains)) {
      (personaData as any).domains.forEach((d: string) => doms.add(d));
    }
    if (personaData.targetDomain) {
      doms.add(personaData.targetDomain);
    }
    (personaData.entries || []).forEach((e: any) => {
      if (e.domain) doms.add(e.domain);
    });
    return Array.from(doms);
  }, [personaData]);

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

  const filteredEntries = useMemo(() => {
    return (personaData.entries || []).filter((entry: any) => {
      if (selectedDomainFilter !== 'all') {
        const entryDomain = entry.domain || personaData.targetDomain;
        if (entryDomain && entryDomain.toLowerCase() !== selectedDomainFilter.toLowerCase()) {
          return false;
        }
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.content.toLowerCase().includes(q) ||
        (entry.tags && entry.tags.some((t: string) => t.toLowerCase().includes(q)))
      );
    });
  }, [personaData, selectedDomainFilter, searchQuery]);

  const handleCopyEntryContent = (content: string) => {
    navigator.clipboard.writeText(content);
    setHasCopiedEntry(true);
    if (showToast) {
      showToast('Observation copied to clipboard', 'info');
    }
    setTimeout(() => setHasCopiedEntry(false), 2000);
  };

  // Metrics computation for Google M3 Stat Cards
  const conceptCount = personaData.graph?.nodes?.length || (personaData.entries?.length ? personaData.entries.length * 2 : 0);
  const connectionCount = personaData.graph?.links?.length || (personaData.entries?.length ? Math.round(personaData.entries.length * 2.5) : 0);
  const totalEntriesCount = personaData.entries?.length || 0;

  return (
    <div
      className="nexus-mind-pane"
      style={{
        maxWidth: '1180px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        padding: '0 16px 32px 16px',
      }}
    >
      {/* 🌟 Google Material Design 3 Top Protocol Header */}
      <div
        className="google-card"
        style={{
          padding: '18px 24px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '260px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'var(--accent-blue-subtle)',
              border: '1px solid var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)',
              flexShrink: 0,
            }}
          >
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-primary)',
                  fontFamily: '"Google Sans", "Google Sans Text", sans-serif',
                }}
              >
                {personaData.personaTitle || `${personaData.targetDomain} Semantic Web`}
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--accent-emerald)',
                  background: 'var(--accent-emerald-subtle)',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--accent-emerald)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Sparkles className="w-3 h-3" />
                <span>{personaData.targetDomain || 'Cover Persona Active'}</span>
              </span>
            </div>
            <p
              style={{
                fontSize: '12.5px',
                color: 'var(--text-secondary)',
                margin: '4px 0 0 0',
                fontWeight: 500,
              }}
            >
              Interactive cognitive ontology, concept relationships, and field observations for the active cover domain.
            </p>
          </div>
        </div>

        {/* Security & Partition Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              fontWeight: 700,
              color: 'var(--accent-emerald)',
              background: 'var(--accent-emerald-subtle)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--accent-emerald)',
            }}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Protected Cover Enclave Active</span>
          </div>

          {onOpenUnlockModal && (
            <button
              type="button"
              onClick={onOpenUnlockModal}
              className="google-btn-secondary"
              style={{
                fontSize: '11.5px',
                padding: '6px 12px',
                gap: '5px',
              }}
              title="Authenticate Real Vault"
            >
              <Unlock className="w-3.5 h-3.5 text-blue-500" />
              <span>Unlock Vault</span>
            </button>
          )}
        </div>
      </div>

      {/* 📊 Google Material 3 Metric Quick-Stats Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* Metric 1: Research Domain */}
        <div className="stat-card-m3" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="stat-label">
              <Globe className="w-4 h-4 text-blue-500" />
              <span>Research Domain</span>
            </span>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: 'var(--accent-blue)',
                background: 'var(--accent-blue-subtle)',
                padding: '2px 8px',
                borderRadius: '100px',
              }}
            >
              Cover
            </span>
          </div>
          <div
            className="stat-value"
            style={{
              fontSize: '18px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={personaData.targetDomain}
          >
            {personaData.targetDomain || 'Botanical Field'}
          </div>
        </div>

        {/* Metric 2: Ontology Concepts */}
        <div className="stat-card-m3" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="stat-label">
              <Brain className="w-4 h-4 text-purple-500" />
              <span>Concept Nodes</span>
            </span>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: '#a855f7',
                background: 'rgba(168, 85, 247, 0.12)',
                padding: '2px 8px',
                borderRadius: '100px',
              }}
            >
              Ontology
            </span>
          </div>
          <div className="stat-value" style={{ fontSize: '24px', fontWeight: 700 }}>
            {conceptCount}
          </div>
        </div>

        {/* Metric 3: Synaptic Links */}
        <div className="stat-card-m3" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="stat-label">
              <Share2 className="w-4 h-4 text-amber-500" />
              <span>Synaptic Links</span>
            </span>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: 'var(--accent-amber)',
                background: 'var(--accent-amber-subtle)',
                padding: '2px 8px',
                borderRadius: '100px',
              }}
            >
              Relations
            </span>
          </div>
          <div className="stat-value" style={{ fontSize: '24px', fontWeight: 700 }}>
            {connectionCount}
          </div>
        </div>

        {/* Metric 4: Field Observations */}
        <div className="stat-card-m3" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="stat-label">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span>Field Logs</span>
            </span>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: 'var(--accent-emerald)',
                background: 'var(--accent-emerald-subtle)',
                padding: '2px 8px',
                borderRadius: '100px',
              }}
            >
              Recorded
            </span>
          </div>
          <div className="stat-value" style={{ fontSize: '24px', fontWeight: 700 }}>
            {totalEntriesCount}
          </div>
        </div>
      </div>

      {/* 🧭 Google Segmented Pill Switcher (Semantic Graph vs Field Logs) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div className="google-segmented-tabs">
          <button
            type="button"
            onClick={() => setActiveTab('graph')}
            className={`google-segmented-tab ${activeTab === 'graph' ? 'active' : ''}`}
            style={{
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <Network className="w-4 h-4" />
            <span>Semantic Graph</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('entries')}
            className={`google-segmented-tab ${activeTab === 'entries' ? 'active' : ''}`}
            style={{
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <BookOpen className="w-4 h-4" />
            <span>Field Logs ({totalEntriesCount})</span>
          </button>
        </div>

        {/* Multi-Domain Filter Chips */}
        {allDomains.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', padding: '4px 0' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedDomainFilter('all')}
              className={`google-chip ${selectedDomainFilter === 'all' ? 'active' : ''}`}
            >
              All Domains ({totalEntriesCount})
            </button>

            {allDomains.map((dom) => {
              const count = (personaData.entries || []).filter(
                (e: any) => (e.domain || personaData.targetDomain) === dom
              ).length;
              const isSelected = selectedDomainFilter.toLowerCase() === dom.toLowerCase();
              return (
                <button
                  key={dom}
                  type="button"
                  onClick={() => setSelectedDomainFilter(dom)}
                  className={`google-chip ${isSelected ? 'active' : ''}`}
                >
                  {dom} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 🕸️ Tab 1: Semantic Memory Graph */}
      {activeTab === 'graph' && (
        <div
          className="google-card"
          style={{
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <SemanticMemoryGraph
            entries={personaData.entries}
            initialGraphData={personaData.graph}
            isProtectedVault={true}
            userId={userId}
            showToast={showToast}
            onSelectConceptPrompt={(prompt) => {
              const match = prompt.match(/"([^"]+)"/);
              const term = match ? match[1] : prompt;
              setSearchQuery(term);
              setActiveTab('entries');
              if (showToast) {
                showToast(`Showing observations for "${term}"`, 'info');
              }
            }}
          />
        </div>
      )}

      {/* 📖 Tab 2: Field Logs & Empirical Observations */}
      {activeTab === 'entries' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search & Layout Controls Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            {/* Google Pill Search Bar */}
            <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '540px' }}>
              <Search
                className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2"
                style={{ pointerEvents: 'none' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${personaData.targetDomain} observations and tags...`}
                style={{
                  width: '100%',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '9999px',
                  padding: '11px 40px 11px 42px',
                  fontSize: '13.5px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: '"Google Sans", "Google Sans Text", sans-serif',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-focus)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-blue-subtle)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '50%',
                  }}
                  title="Clear search query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* List / Grid Layout Switcher */}
            <div
              className="google-segmented-tabs"
              role="group"
              aria-label="Persona logs layout"
              style={{ padding: '3px' }}
            >
              <button
                type="button"
                onClick={() => setViewLayout('grid')}
                className={`google-segmented-tab ${viewLayout === 'grid' ? 'active' : ''}`}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  gap: '6px',
                }}
                title="Switch to Grid View"
                aria-pressed={viewLayout === 'grid'}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setViewLayout('list')}
                className={`google-segmented-tab ${viewLayout === 'list' ? 'active' : ''}`}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  gap: '6px',
                }}
                title="Switch to List View"
                aria-pressed={viewLayout === 'list'}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
            </div>
          </div>

          {/* Cards Display Container */}
          {filteredEntries.length === 0 ? (
            /* Google Empty State Card */
            <div
              className="google-card"
              style={{
                padding: '56px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                borderRadius: '20px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'var(--accent-blue-subtle)',
                  color: 'var(--accent-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BookOpen className="w-7 h-7" />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: '17px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: '0 0 6px 0',
                    fontFamily: '"Google Sans", sans-serif',
                  }}
                >
                  No observations found
                </h3>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    maxWidth: '400px',
                  }}
                >
                  {searchQuery
                    ? `No field observations match "${searchQuery}". Try a different search term or reset filters.`
                    : 'No field observations have been generated for this domain persona yet.'}
                </p>
              </div>

              {(searchQuery || selectedDomainFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDomainFilter('all');
                  }}
                  className="google-btn-primary"
                  style={{ fontSize: '12.5px', marginTop: '8px' }}
                >
                  Reset Search & Filters
                </button>
              )}
            </div>
          ) : (
            /* List / Grid Cards */
            <div
              id="persona-entries-container"
              style={
                viewLayout === 'grid'
                  ? {
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
                      gap: '16px',
                      width: '100%',
                    }
                  : {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      width: '100%',
                    }
              }
            >
              {filteredEntries.map((entry: any) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className="google-card"
                  style={{
                    padding: '20px',
                    cursor: 'pointer',
                    minWidth: 0,
                    maxWidth: '100%',
                    width: '100%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderRadius: '18px',
                    position: 'relative',
                  }}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedEntry(entry);
                    }
                  }}
                >
                  <div>
                    {/* Header Row: Mood pill + Date */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--accent-emerald)',
                          background: 'var(--accent-emerald-subtle)',
                          padding: '2px 10px',
                          borderRadius: '100px',
                          border: '1px solid var(--accent-emerald)',
                        }}
                      >
                        {entry.mood || 'Observation'}
                      </span>
                      <span
                        style={{
                          fontSize: '11.5px',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        {new Date(entry.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Title */}
                    <h3
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        margin: '0 0 8px 0',
                        fontFamily: '"Google Sans", sans-serif',
                        lineHeight: 1.35,
                      }}
                    >
                      {entry.title}
                    </h3>

                    {/* Excerpt */}
                    <p
                      style={{
                        fontSize: '13.5px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.55,
                        margin: '0 0 14px 0',
                        display: '-webkit-box',
                        WebkitLineClamp: viewLayout === 'grid' ? 3 : 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {entry.content}
                    </p>
                  </div>

                  {/* Footer Row: Tags & Read Indicator */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginTop: 'auto',
                      paddingTop: '10px',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {entry.tags && entry.tags.length > 0 ? (
                        entry.tags.map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--text-secondary)',
                              background: 'var(--bg-main)',
                              border: '1px solid var(--border-subtle)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-dim)',
                            fontStyle: 'italic',
                          }}
                        >
                          Empirical Log
                        </span>
                      )}
                    </div>

                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: 'var(--accent-blue)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Read</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 🔍 Google Material 3 Observation Reading Modal */}
      {selectedEntry && (
        <div
          className="google-dialog-container"
          onClick={() => setSelectedEntry(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="google-dialog-surface"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '640px',
              padding: '28px',
              borderRadius: '24px',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--accent-emerald)',
                    background: 'var(--accent-emerald-subtle)',
                    padding: '3px 10px',
                    borderRadius: '100px',
                    border: '1px solid var(--accent-emerald)',
                  }}
                >
                  {selectedEntry.mood || 'Empirical Observation'}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--accent-blue)',
                    background: 'var(--accent-blue-subtle)',
                    padding: '3px 10px',
                    borderRadius: '100px',
                    border: '1px solid var(--accent-blue)',
                  }}
                >
                  {personaData.targetDomain}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title */}
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 6px 0',
                fontFamily: '"Google Sans", sans-serif',
                lineHeight: 1.35,
              }}
            >
              {selectedEntry.title}
            </h2>

            {/* Date & Time */}
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>
                Logged on{' '}
                {new Date(selectedEntry.createdAt).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}{' '}
                at{' '}
                {new Date(selectedEntry.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Content Box */}
            <div
              className="google-modal-scroll"
              style={{
                fontSize: '14px',
                color: 'var(--text-primary)',
                lineHeight: 1.65,
                background: 'var(--bg-main)',
                border: '1px solid var(--border-subtle)',
                padding: '18px 20px',
                borderRadius: '16px',
                maxHeight: '340px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                marginBottom: '18px',
                fontFamily: '"Google Sans Text", -apple-system, sans-serif',
              }}
            >
              {selectedEntry.content}
            </div>

            {/* Tags Strip */}
            {selectedEntry.tags && selectedEntry.tags.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginBottom: '20px',
                }}
              >
                {selectedEntry.tags.map((tag: string, idx: number) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: 'var(--accent-blue)',
                      background: 'var(--accent-blue-subtle)',
                      border: '1px solid var(--accent-blue)',
                      padding: '3px 10px',
                      borderRadius: '100px',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '16px',
              }}
            >
              <button
                type="button"
                onClick={() => handleCopyEntryContent(selectedEntry.content)}
                className="google-btn-secondary"
                style={{ fontSize: '12.5px' }}
              >
                {hasCopiedEntry ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="google-btn-primary"
                style={{ fontSize: '12.5px' }}
              >
                Close Observation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
