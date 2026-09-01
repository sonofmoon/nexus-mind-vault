import React from 'react';
import { JournalEntry } from '../types';
import { BarChart3, ShieldCheck, Flame, BookOpen, Clock, Activity } from 'lucide-react';
import { AITrendsCard } from './AITrendsCard';

interface InsightsViewProps {
  entries: JournalEntry[];
}

export const InsightsView: React.FC<InsightsViewProps> = ({ entries }) => {
  const totalEntries = entries.length;

  const moodCounts: Record<string, number> = {};
  entries.forEach((e) => {
    moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
  });

  let mostFrequentMood = 'N/A';
  let maxCount = 0;
  Object.entries(moodCounts).forEach(([mood, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostFrequentMood = mood.charAt(0).toUpperCase() + mood.slice(1);
    }
  });

  const totalWords = entries.reduce((acc, e) => acc + e.content.split(/\s+/).filter(Boolean).length, 0);

  return (
    <div className="insights-view-pane" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '0 16px 32px 16px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
          <BarChart3 className="w-5 h-5 text-blue-500" />
          Vault Security &amp; Reflection Insights
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
          AI cognitive trends, emotional frequency breakdown, and zero-trust session audit metrics.
        </p>
      </div>

      {/* Overview Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>
            <span>Total Entries</span>
            <BookOpen className="w-4 h-4 text-blue-500" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{totalEntries}</div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Encrypted journal logs</span>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>
            <span>Dominant Mood</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{mostFrequentMood}</div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{maxCount > 0 ? `${maxCount} entries recorded` : 'No data'}</span>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>
            <span>Total Words</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{totalWords.toLocaleString()}</div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Written in vault</span>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>
            <span>Security Rating</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-emerald)', fontFamily: 'var(--font-sans)' }}>Zero-Trust</div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Isolated client session</span>
        </div>
      </div>

      {/* AI Cognitive Trends & Executive Synthesis Card */}
      <AITrendsCard entries={entries} />

      {/* Mood Distribution */}
      <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
          Mood Frequency Breakdown
        </h3>

        {totalEntries === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Add journal entries to visualize mood patterns.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(moodCounts).map(([mood, count]) => {
              const percentage = Math.round((count / totalEntries) * 100);
              return (
                <div key={mood}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-secondary)' }}>{mood}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{count} ({percentage}%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-main)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: mood === 'focused' ? 'var(--accent-emerald)' : mood === 'creative' ? '#c084fc' : mood === 'anxious' ? 'var(--accent-rose)' : 'var(--accent-blue)',
                        borderRadius: 'var(--radius-pill)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security Audit Log */}
      <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock className="w-4 h-4 text-blue-400" />
          Recent Session Security Events
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>[SUCCESS] Zero-Trust Session Active</span>
            <span style={{ color: 'var(--text-muted)' }}>Just now</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Protected Vault default route enforced</span>
            <span style={{ color: 'var(--text-muted)' }}>Session Init</span>
          </div>
        </div>
      </div>
    </div>
  );
};
