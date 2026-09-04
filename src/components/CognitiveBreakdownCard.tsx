import React, { useState } from 'react';
import { MoodType } from '../types';
import {
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Share2,
  RotateCcw,
  Trash2,
  Tag,
  Compass,
  Target,
  Smile,
  Flame,
  Frown,
  Moon,
  Clock,
  ArrowRight,
  Brain,
  Zap,
  Edit3,
} from 'lucide-react';

export interface CognitiveBreakdown {
  title: string;
  summary: string;
  mood: MoodType;
  emotionalTrajectory: string;
  cognitivePatterns: string[];
  groundingTakeaways: string[];
  suggestedTags: string[];
  rawTranscript: string;
  durationSeconds?: number;
}

interface CognitiveBreakdownCardProps {
  breakdown: CognitiveBreakdown;
  onSaveToVault: (entry: {
    title: string;
    content: string;
    mood: MoodType;
    tags: string[];
  }) => void;
  onDiscard: () => void;
  onRestartVoice: () => void;
  onViewGraph?: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const MOOD_OPTIONS: { type: MoodType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'calm', label: 'Calm', icon: <Compass className="w-3.5 h-3.5" />, color: '#38bdf8' },
  { type: 'focused', label: 'Focused', icon: <Target className="w-3.5 h-3.5" />, color: '#34d399' },
  { type: 'creative', label: 'Creative', icon: <Smile className="w-3.5 h-3.5" />, color: '#c084fc' },
  { type: 'energetic', label: 'Energetic', icon: <Flame className="w-3.5 h-3.5" />, color: '#fbbf24' },
  { type: 'anxious', label: 'Anxious', icon: <Frown className="w-3.5 h-3.5" />, color: '#f87171' },
  { type: 'tired', label: 'Tired', icon: <Moon className="w-3.5 h-3.5" />, color: '#94a3b8' },
];

export const CognitiveBreakdownCard: React.FC<CognitiveBreakdownCardProps> = ({
  breakdown,
  onSaveToVault,
  onDiscard,
  onRestartVoice,
  onViewGraph,
  showToast,
}) => {
  const [title, setTitle] = useState(breakdown.title || 'Voice Reflection & Cognitive Synthesis');
  const [summary, setSummary] = useState(breakdown.summary);
  const [selectedMood, setSelectedMood] = useState<MoodType>(breakdown.mood || 'focused');
  const [tags, setTags] = useState<string[]>(
    breakdown.suggestedTags.length > 0 ? breakdown.suggestedTags : ['voice-mirror', 'cognitive-synthesis']
  );
  const [newTagInput, setNewTagInput] = useState('');
  const [isSealing, setIsSealing] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    const clean = newTagInput.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSeal = () => {
    setIsSealing(true);
    const fullContent = [
      `### Executive Synthesis`,
      summary,
      '',
      `### Emotional Trajectory`,
      breakdown.emotionalTrajectory || 'Grounded in reflection.',
      '',
      `### Cognitive Patterns & Distortions Detected`,
      breakdown.cognitivePatterns.map((p) => `- ${p}`).join('\n') || '- None detected; high clarity demonstrated.',
      '',
      `### Grounding Action Takeaways`,
      breakdown.groundingTakeaways.map((t) => `- [ ] ${t}`).join('\n') || '- Continue mindful reflection.',
      '',
      `---`,
      `### Full Audio Transcript`,
      breakdown.rawTranscript,
    ].join('\n');

    onSaveToVault({
      title,
      content: fullContent,
      mood: selectedMood,
      tags: Array.from(new Set([...tags, 'voice-session', 'neural-mirror'])),
    });

    showToast('🎙️ Voice reflection AES-256 encrypted & sealed into Sovereign Vault!', 'success');
  };

  return (
    <div
      style={{
        maxWidth: '780px',
        margin: '0 auto',
        padding: '24px',
        background: 'var(--bg-surface)',
        borderRadius: '24px',
        border: '1px solid rgba(139, 92, 246, 0.35)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.25), 0 0 24px rgba(139, 92, 246, 0.15)',
        backdropFilter: 'blur(20px)',
        color: 'var(--text-primary)',
        animation: 'fadeIn 0.35s ease',
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.35)',
            }}
          >
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Cognitive Reflection Breakdown
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Neural voice synthesis complete • Zero-knowledge AES-256 seal pending
            </div>
          </div>
        </div>

        {breakdown.durationSeconds && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              fontSize: '11.5px',
              color: '#8b5cf6',
              fontWeight: 600,
            }}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {Math.floor(breakdown.durationSeconds / 60)}m {breakdown.durationSeconds % 60}s Session
            </span>
          </div>
        )}
      </div>

      {/* Editable Session Title */}
      <div style={{ marginBottom: '18px' }}>
        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
          Session Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="E.g., Breakthrough Reflection on Launch & Sleep"
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-sidebar)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: 700,
            outline: 'none',
          }}
        />
      </div>

      {/* Mood Selector Pill Bar */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Detected Emotional State
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {MOOD_OPTIONS.map((m) => {
            const isSelected = selectedMood === m.type;
            return (
              <button
                key={m.type}
                type="button"
                onClick={() => setSelectedMood(m.type)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? `${m.color}22` : 'var(--bg-sidebar)',
                  color: isSelected ? m.color : 'var(--text-muted)',
                  border: isSelected ? `1.5px solid ${m.color}` : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Emotional Trajectory Card */}
      {breakdown.emotionalTrajectory && (
        <div
          style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(99, 102, 241, 0.08))',
            borderRadius: '14px',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Zap className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <div style={{ fontSize: '12.5px', lineHeight: '1.4' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Emotional Arc: </strong>
            <span style={{ color: 'var(--text-secondary)' }}>{breakdown.emotionalTrajectory}</span>
          </div>
        </div>
      )}

      {/* Executive Summary */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Core Reflection & Synthesis
          </label>
          <button
            type="button"
            onClick={() => setIsEditingSummary(!isEditingSummary)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '11px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Edit3 className="w-3 h-3" />
            <span>{isEditingSummary ? 'Done' : 'Edit'}</span>
          </button>
        </div>

        {isEditingSummary ? (
          <textarea
            rows={4}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-sidebar)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              lineHeight: '1.5',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        ) : (
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--bg-sidebar)',
              borderRadius: '14px',
              border: '1px solid var(--border-subtle)',
              fontSize: '13px',
              lineHeight: '1.55',
              color: 'var(--text-primary)',
            }}
          >
            {summary}
          </div>
        )}
      </div>

      {/* Two Column Grid: Cognitive Patterns & Grounding Takeaways */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* Cognitive Patterns / Distortions */}
        <div
          style={{
            padding: '14px',
            background: 'var(--bg-sidebar)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Cognitive Patterns & Habits</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {breakdown.cognitivePatterns.length > 0 ? (
              breakdown.cognitivePatterns.map((pattern, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '8px',
                    background: 'rgba(168, 85, 247, 0.12)',
                    color: '#c084fc',
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                  }}
                >
                  {pattern}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Mindful clarity detected; no acute distortions present.
              </span>
            )}
          </div>
        </div>

        {/* Grounding Takeaways */}
        <div
          style={{
            padding: '14px',
            background: 'var(--bg-sidebar)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Grounding Action Points</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            {breakdown.groundingTakeaways.length > 0 ? (
              breakdown.groundingTakeaways.map((takeaway, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>
                  {takeaway}
                </li>
              ))
            ) : (
              <li>Protect quiet space to let thoughts integrate naturally.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Semantic Graph Concept Tags */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
          Semantic Graph Concept Tags (Sprouts nodes in Mind Graph)
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#818cf8',
                fontSize: '11px',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}
            >
              #{tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: 0,
                  marginLeft: '2px',
                  fontSize: '12px',
                }}
              >
                ×
              </button>
            </span>
          ))}

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="text"
              placeholder="+ add tag"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              style={{
                padding: '3px 8px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '11px',
                width: '90px',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Action Footer Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={onDiscard}
            style={{ fontSize: '12px', padding: '6px 12px', color: 'var(--text-muted)' }}
          >
            <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Discard
          </button>
          <button
            type="button"
            className="btn-secondary btn-inline"
            onClick={onRestartVoice}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Resume Voice Call
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onViewGraph && (
            <button
              type="button"
              className="btn-secondary btn-inline"
              onClick={() => {
                handleSeal();
                onViewGraph();
              }}
              style={{
                fontSize: '12px',
                padding: '8px 14px',
                color: '#8b5cf6',
                borderColor: 'rgba(139, 92, 246, 0.4)',
                background: 'rgba(139, 92, 246, 0.08)',
                fontWeight: 600,
              }}
            >
              <Share2 className="w-3.5 h-3.5 inline mr-1" /> Seal & View Graph
            </button>
          )}

          <button
            type="button"
            onClick={handleSeal}
            disabled={isSealing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isSealing ? 'wait' : 'pointer',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isSealing ? 'Encrypting...' : 'Encrypt & Seal into Vault'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
