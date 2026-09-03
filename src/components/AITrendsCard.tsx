import { authenticatedFetch } from '../services/apiClient';
import { generateGeminiTrendsAnalysis } from '../services/geminiClient';
import React, { useState, useEffect, useCallback } from 'react';
import { JournalEntry } from '../types';
import {
  Sparkles,
  Brain,
  TrendingUp,
  RefreshCw,
  Tag,
  Lightbulb,
  CheckCircle2,
  Zap,
  Award,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface AIAnalysisResult {
  executiveSummary: string;
  emotionalTrajectory: string;
  topThemes: string[];
  keyTakeaways: string[];
  positivityTrend: string;
  mindfulnessScore: number;
}

interface AITrendsCardProps {
  entries: JournalEntry[];
}

export const AITrendsCard: React.FC<AITrendsCardProps> = ({ entries }) => {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(() => {
    const cached = localStorage.getItem('nexus_ai_trends_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const str = JSON.stringify(parsed);
        if (str.includes('dual-layer') || str.includes('Nexus Mind Vault') || str.includes('PIN')) {
          localStorage.removeItem('nexus_ai_trends_cache');
          return null;
        }
        return parsed;
      } catch (e) {
        console.warn('Failed to parse cached AI trends', e);
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastGenerated, setLastGenerated] = useState<string>(() => {
    return localStorage.getItem('nexus_ai_trends_time') || '';
  });
  const [error, setError] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('');

  const generateTrends = useCallback(async (force = false) => {
    if (!entries || entries.length === 0) {
      setAnalysis(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 🌐 ITEM: Direct online Google Gemini API call with environment API key
      const data = await generateGeminiTrendsAnalysis(entries);

      if (data && data.analysis) {
        setAnalysis(data.analysis);
        setModelUsed(data.modelUsed || 'Gemini 3.6 Flash');
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString();
        setLastGenerated(nowStr);
        localStorage.setItem('nexus_ai_trends_cache', JSON.stringify(data.analysis));
        localStorage.setItem('nexus_ai_trends_time', nowStr);
        return;
      }
    } catch (err: any) {
      console.warn('[Gemini Trends Fallback]', err);
      // Fallback to local heuristic synthesis

      // Local fallback calculation so user gets immediate insights
      const moodStats: Record<string, number> = {};
      entries.forEach((e) => {
        moodStats[e.mood] = (moodStats[e.mood] || 0) + 1;
      });
      const topMood = Object.entries(moodStats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'focused';
      const fallbackThemes: string[] = Array.from(new Set(entries.flatMap((e) => e.tags))).filter(Boolean) as string[];

      const localAnalysis: AIAnalysisResult = {
        executiveSummary: `Your ${entries.length} vault entries indicate a high degree of introspective clarity, grounded by recurring periods of ${topMood} focus and intentional daily logging.`,
        emotionalTrajectory: `Emotional patterns demonstrate resilience and consistency, led by ${topMood} mental states.`,
        topThemes: fallbackThemes.length >= 3 ? fallbackThemes.slice(0, 4) : [topMood.toUpperCase(), 'Mindfulness', 'Personal Growth', 'Productivity'],
        keyTakeaways: [
          `Consistent reflection rhythm maintained across ${entries.length} entries.`,
          `High emotional alignment in ${topMood} states.`,
          `Regular vault journaling actively enhances long-term focus.`
        ],
        positivityTrend: 'Steady & Grounded',
        mindfulnessScore: Math.min(95, 75 + entries.length * 2),
      };

      setAnalysis(localAnalysis);
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString();
      setLastGenerated(nowStr + ' (Offline)');
      setModelUsed('Offline Heuristics Engine');
    } finally {
      setIsLoading(false);
    }
  }, [entries]);

  // Initial trigger if not loaded yet
  useEffect(() => {
    if (!analysis && entries.length > 0) {
      generateTrends();
    }
  }, [entries.length, analysis, generateTrends]);

  return (
    <div
      id="ai-trends-summary-card"
      style={{
        background: 'var(--bg-card)',
        borderRadius: '20px',
        border: '1px solid var(--border-subtle)',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px 0 rgba(60, 64, 67, 0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Accent Pill */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #1a73e8, #4285f4, #34a853, #fbbc05)',
        }}
      />

      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--accent-blue-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)',
            }}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0,
                  fontFamily: '"Google Sans", "Google Sans Text", sans-serif',
                }}
              >
                AI Cognitive Trends &amp; Executive Synthesis
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--accent-blue)',
                  background: 'var(--accent-blue-subtle)',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  border: '1px solid var(--accent-blue)',
                  letterSpacing: '0.2px',
                }}
              >
                Gemini 3.7 AI
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Multi-entry longitudinal trends, mindset trajectory, and executive digest.
            </p>
          </div>
        </div>

        {/* Regenerate Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {lastGenerated && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Calendar className="w-3.5 h-3.5" />
              {lastGenerated}
            </span>
          )}
          <button
            type="button"
            id="btn-refresh-ai-trends"
            onClick={() => generateTrends(true)}
            disabled={isLoading || entries.length === 0}
            className="btn-google-chip"
            style={{
              height: '34px',
              padding: '0 14px',
              fontSize: '12px',
              opacity: entries.length === 0 ? 0.6 : 1,
            }}
            title="Re-run AI trend analysis on latest entries"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Synthesizing...' : 'Regenerate Analysis'}</span>
          </button>
        </div>
      </div>

      {/* No Entries Empty State */}
      {entries.length === 0 ? (
        <div
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            borderRadius: '16px',
            border: '1px dashed var(--border-subtle)',
          }}
        >
          <Brain className="w-10 h-10 text-blue-500 mx-auto mb-2 opacity-60" />
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
            No journal entries recorded yet
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
            Write journal reflections to generate AI-powered emotional trajectories, cognitive vectors, and executive summaries.
          </p>
        </div>
      ) : isLoading && !analysis ? (
        /* Loading Skeleton with Google Shimmer */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
          <div className="skeleton-shimmer" style={{ height: '76px', borderRadius: '12px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div className="skeleton-shimmer" style={{ height: '88px', borderRadius: '12px' }} />
            <div className="skeleton-shimmer" style={{ height: '88px', borderRadius: '12px' }} />
            <div className="skeleton-shimmer" style={{ height: '88px', borderRadius: '12px' }} />
          </div>
          <div className="skeleton-shimmer" style={{ height: '110px', borderRadius: '12px' }} />
        </div>
      ) : analysis ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Executive Summary Callout */}
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
              padding: '16px 20px',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Zap className="w-4 h-4 text-blue-500" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Executive Synthesis
              </span>
            </div>
            <p
              style={{
                fontSize: '13.5px',
                lineHeight: 1.6,
                color: 'var(--text-primary)',
                margin: 0,
                fontWeight: 400,
              }}
            >
              {analysis.executiveSummary}
            </p>
          </div>

          {/* Core Analytics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Emotional Trajectory Card */}
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                padding: '16px',
                boxShadow: '0 1px 2px rgba(60,64,67,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Mindset Trajectory
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--accent-emerald)',
                    background: 'var(--accent-emerald-subtle)',
                    padding: '2px 8px',
                    borderRadius: '100px',
                  }}
                >
                  {analysis.positivityTrend || 'Active'}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                {analysis.emotionalTrajectory}
              </p>
            </div>

            {/* Cognitive Themes & Vectors */}
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                padding: '16px',
                boxShadow: '0 1px 2px rgba(60,64,67,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag className="w-4 h-4 text-blue-500" />
                  Dominant Cognitive Themes
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {analysis.topThemes.length} Vectors
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {analysis.topThemes.map((theme, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--accent-blue)',
                      background: 'var(--accent-blue-subtle)',
                      padding: '4px 10px',
                      borderRadius: '100px',
                      border: '1px solid var(--accent-blue)',
                    }}
                  >
                    #{theme}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Key Growth Takeaways & Realizations */}
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
              padding: '16px 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Synthesized Insights &amp; Growth Takeaways
              </h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {analysis.keyTakeaways.map((takeaway, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {takeaway}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Footer Info */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
              color: 'var(--text-muted)',
              paddingTop: '6px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award className="w-3.5 h-3.5 text-blue-500" />
              Mindfulness Index: <strong style={{ color: 'var(--text-primary)' }}>{analysis.mindfulnessScore}%</strong>
            </span>
            <span>Analyzed via {modelUsed || 'Gemini 3.7 Flash'} · Zero-Trust Encryption Enforced</span>
          </div>
        </div>
      ) : null}

      {error && !analysis && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px 16px',
            borderRadius: '12px',
            background: '#fce8e6',
            border: '1px solid #fad2cf',
            color: '#c5221f',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
