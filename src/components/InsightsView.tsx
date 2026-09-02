import React, { useMemo } from 'react';
import { JournalEntry } from '../types';
import { BarChart3, ShieldCheck, Flame, BookOpen, Clock, Activity, TrendingUp, Calendar, Tag, Sun, Moon } from 'lucide-react';
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

  const totalWords = entries.reduce((acc, e) => acc + (e.content || '').split(/\s+/).filter(Boolean).length, 0);

  // 1. Mood Valence Trajectory calculation (Chronological last 14 entries)
  const moodValenceMap: Record<string, number> = {
    energetic: 95,
    creative: 85,
    focused: 80,
    calm: 75,
    neutral: 50,
    tired: 30,
    anxious: 15,
  };

  const sortedChronological = useMemo(() => {
    return [...entries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [entries]);

  const recentMoodPoints = useMemo(() => {
    const recent = sortedChronological.slice(-14);
    if (recent.length === 0) return [];
    return recent.map((e, idx) => ({
      idx,
      title: e.title,
      date: new Date(e.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      mood: e.mood,
      val: moodValenceMap[e.mood] || 50,
    }));
  }, [sortedChronological]);

  // 2. 52-Week (or 16-Week) Contribution Heatmap Matrix
  const heatmapDays = useMemo(() => {
    const dayCounts: Record<string, number> = {};
    entries.forEach(e => {
      const day = new Date(e.createdAt).toISOString().split('T')[0];
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const days = [];
    const today = new Date();
    for (let i = 111; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push({
        date: key,
        dayOfWeek: d.getDay(),
        count: dayCounts[key] || 0,
        formatted: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      });
    }
    return days;
  }, [entries]);

  // 3. Top Tags Frequency Cloud
  const tagFrequency = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => {
      (e.tags || []).forEach(t => {
        const clean = t.trim().toLowerCase();
        if (clean) counts[clean] = (counts[clean] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [entries]);

  // 4. Time of Day Writing Distribution
  const timeDistribution = useMemo(() => {
    let morning = 0;   // 6 - 12
    let afternoon = 0; // 12 - 18
    let evening = 0;   // 18 - 24
    let night = 0;     // 0 - 6

    entries.forEach(e => {
      const hour = new Date(e.createdAt).getHours();
      if (hour >= 6 && hour < 12) morning++;
      else if (hour >= 12 && hour < 18) afternoon++;
      else if (hour >= 18 && hour < 24) evening++;
      else night++;
    });

    return [
      { label: 'Morning (6am-12pm)', count: morning, icon: '🌅', color: '#f59e0b' },
      { label: 'Afternoon (12pm-6pm)', count: afternoon, icon: '☀️', color: '#3b82f6' },
      { label: 'Evening (6pm-12am)', count: evening, icon: '🌆', color: '#8b5cf6' },
      { label: 'Night (12am-6am)', count: night, icon: '🌙', color: '#06b6d4' },
    ];
  }, [entries]);

  return (
    <div className="insights-view-pane" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '0 16px 32px 16px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
          <BarChart3 className="w-5 h-5 text-blue-500" />
          Vault Security & Reflection Insights
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

      {/* 📈 ITEM 20: Mood Trajectory Interactive SVG Line Chart */}
      <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 16px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Emotional Valence & Mood Trajectory (Recent Reflections)
        </h3>

        {recentMoodPoints.length < 2 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Add at least 2 journal entries to plot your longitudinal emotional trajectory curve.</p>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto', paddingTop: '10px' }}>
            <svg viewBox="0 0 700 160" style={{ width: '100%', height: '160px', overflow: 'visible' }}>
              <defs>
                <linearGradient id="valenceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="40" y1="20" x2="680" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="4" />
              <line x1="40" y1="75" x2="680" y2="75" stroke="rgba(255,255,255,0.06)" strokeDasharray="4" />
              <line x1="40" y1="130" x2="680" y2="130" stroke="rgba(255,255,255,0.06)" strokeDasharray="4" />

              {/* Connected Area Path */}
              {(() => {
                const points = recentMoodPoints.map((pt, i) => {
                  const x = 50 + (i / (recentMoodPoints.length - 1)) * 620;
                  const y = 140 - (pt.val / 100) * 115;
                  return { x, y, pt };
                });

                const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                const areaPath = `${linePath} L ${points[points.length - 1].x} 140 L ${points[0].x} 140 Z`;

                return (
                  <>
                    <path d={areaPath} fill="url(#valenceGrad)" />
                    <path d={linePath} fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="5" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
                        <text x={p.x} y={155} fill="var(--text-muted)" fontSize="10" textAnchor="middle">{p.pt.date}</text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        )}
      </div>

      {/* 📅 ITEM 20: 16-Week Contribution Heatmap Calendar (GitHub Style) */}
      <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 14px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar className="w-4 h-4 text-purple-400" />
          Reflection Frequency Calendar (112 Days)
        </h3>

        <div style={{ display: 'grid', gridAutoFlow: 'column', gridTemplateRows: 'repeat(7, 12px)', gap: '4px', overflowX: 'auto', paddingBottom: '6px' }}>
          {heatmapDays.map((d, i) => {
            let bg = 'rgba(255,255,255,0.05)';
            if (d.count === 1) bg = 'rgba(168, 85, 247, 0.4)';
            else if (d.count === 2) bg = 'rgba(168, 85, 247, 0.7)';
            else if (d.count >= 3) bg = '#a855f7';

            return (
              <div
                key={i}
                title={`${d.formatted}: ${d.count} entries`}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '2px',
                  background: bg,
                  transition: 'transform 0.15s ease',
                  cursor: 'pointer',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* 🏷️ ITEM 20: Topic Tags Cloud & Time of Day Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Tag Frequency Matrix */}
        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 14px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Tag className="w-4 h-4 text-cyan-400" />
            Top Thought Tags & Themes
          </h3>
          {tagFrequency.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Add #tags to your entries to extract thematic clusters.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {tagFrequency.map(([tag, count]) => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '100px',
                    background: 'rgba(6, 182, 212, 0.12)',
                    color: '#22d3ee',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  #{tag} <span style={{ opacity: 0.7, fontSize: '10px' }}>({count})</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Time of Day Writing Distribution */}
        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 14px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock className="w-4 h-4 text-amber-400" />
            Writing Velocity by Time of Day
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {timeDistribution.map(t => {
              const pct = totalEntries > 0 ? Math.round((t.count / totalEntries) * 100) : 0;
              return (
                <div key={t.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>{t.icon} {t.label}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{t.count} ({pct}%)</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-main)', borderRadius: '100px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: t.color, borderRadius: '100px', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
