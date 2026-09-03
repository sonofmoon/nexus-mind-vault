import React, { useMemo, useState } from 'react';
import { JournalEntry } from '../types';
import { BarChart3, ShieldCheck, Flame, BookOpen, Clock, Activity, Calendar, Tag, Sun, Moon, ChevronLeft, ChevronRight } from 'lucide-react';
import { AITrendsCard } from './AITrendsCard';

interface InsightsViewProps {
  entries: JournalEntry[];
}

export const InsightsView: React.FC<InsightsViewProps> = ({ entries }) => {
  const totalEntries = entries.length;

  // Active Month State for Reflection Frequency Calendar
  const [activeMonthDate, setActiveMonthDate] = useState<Date>(() => new Date());

  const handlePrevMonth = () => {
    setActiveMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setActiveMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const handleTodayMonth = () => {
    setActiveMonthDate(new Date());
  };

  const activeYear = activeMonthDate.getFullYear();
  const activeMonth = activeMonthDate.getMonth();
  const monthName = activeMonthDate.toLocaleString('en-US', { month: 'long' });
  const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
  const isCurrentCalendarMonth = new Date().getFullYear() === activeYear && new Date().getMonth() === activeMonth;
  const todayDayNum = new Date().getDate();

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

  // 1. Active Month Reflection Activity Days (1 to 28/29/30/31 in Ascending Order)
  const monthDays = useMemo(() => {
    const dayCounts: Record<number, number> = {};
    entries.forEach(e => {
      const dateObj = new Date(e.createdAt);
      if (dateObj.getFullYear() === activeYear && dateObj.getMonth() === activeMonth) {
        const day = dateObj.getDate();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
    });

    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(activeYear, activeMonth, day);
      const weekday = d.toLocaleString('en-US', { weekday: 'narrow' });
      const formatted = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      const count = dayCounts[day] || 0;
      const isToday = isCurrentCalendarMonth && day === todayDayNum;

      days.push({
        dayNum: day,
        weekday,
        count,
        formatted,
        isToday,
      });
    }
    return days;
  }, [entries, activeYear, activeMonth, daysInMonth, isCurrentCalendarMonth, todayDayNum]);

  const monthTotalReflections = useMemo(() => {
    return monthDays.reduce((acc, d) => acc + d.count, 0);
  }, [monthDays]);

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


      {/* 📅 Monthly Reflection Activity Matrix (e.g. September - 2026) */}
      <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', marginBottom: '24px', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar className="w-4 h-4 text-purple-400" />
              <span>{monthName} - {activeYear}</span>
            </h3>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-purple, #a855f7)', background: 'rgba(168, 85, 247, 0.12)', padding: '2px 8px', borderRadius: '100px', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
              {monthTotalReflections} {monthTotalReflections === 1 ? 'Reflection' : 'Reflections'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Month Switcher Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-main)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="btn btn-icon"
                title="Previous Month"
                style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
              >
                <ChevronLeft className="w-4 h-4 text-secondary" />
              </button>
              <button
                type="button"
                onClick={handleTodayMonth}
                className="btn"
                style={{ fontSize: '11px', padding: '2px 8px', height: '26px', borderRadius: '6px', background: isCurrentCalendarMonth ? 'rgba(168, 85, 247, 0.2)' : 'transparent', color: isCurrentCalendarMonth ? '#a855f7' : 'var(--text-secondary)', fontWeight: 600 }}
              >
                Current
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="btn btn-icon"
                title="Next Month"
                style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
              >
                <ChevronRight className="w-4 h-4 text-secondary" />
              </button>
            </div>

            {/* Less / More Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <span>Less</span>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(128,128,128,0.12)' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(168, 85, 247, 0.4)' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(168, 85, 247, 0.7)' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#a855f7' }} />
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Days Grid (1 to 28/29/30/31 in Ascending Order) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(28px, 1fr))', gap: '6px' }}>
          {monthDays.map((d) => {
            let bg = 'rgba(128, 128, 128, 0.08)';
            let border = d.isToday ? '1.5px solid var(--accent-purple, #a855f7)' : '1px solid var(--border-subtle)';
            if (d.count === 1) { bg = 'rgba(168, 85, 247, 0.35)'; if (!d.isToday) border = '1px solid rgba(168, 85, 247, 0.5)'; }
            else if (d.count === 2) { bg = 'rgba(168, 85, 247, 0.65)'; if (!d.isToday) border = '1px solid rgba(168, 85, 247, 0.8)'; }
            else if (d.count >= 3) { bg = '#a855f7'; if (!d.isToday) border = '1px solid #c084fc'; }

            return (
              <div
                key={d.dayNum}
                title={`${d.formatted}: ${d.count} ${d.count === 1 ? 'reflection' : 'reflections'}${d.isToday ? ' (Today)' : ''}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 2px',
                  borderRadius: '8px',
                  background: bg,
                  border: border,
                  boxShadow: d.isToday ? '0 0 8px rgba(168, 85, 247, 0.3)' : 'none',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                  minHeight: '44px',
                  position: 'relative',
                }}
              >
                <span style={{ fontSize: '9px', textTransform: 'uppercase', color: d.isToday ? '#a855f7' : 'var(--text-muted)', fontWeight: 700, lineHeight: 1 }}>
                  {d.weekday}
                </span>
                <span style={{ fontSize: '11px', fontWeight: d.isToday ? 800 : 600, color: d.count > 0 ? '#fff' : (d.isToday ? '#a855f7' : 'var(--text-secondary)'), marginTop: '2px' }}>
                  {d.dayNum}
                </span>
                {d.count > 0 && (
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: d.count >= 3 ? '#fff' : '#c084fc', marginTop: '3px' }} />
                )}
              </div>
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
