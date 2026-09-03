import { authenticatedFetch } from '../services/apiClient';
import { sanitizePlainText } from '../utils/sanitizeHtml';
import React, { useState, useEffect, useMemo } from 'react';
import { TimeCapsule, MoodType } from '../types';
import { CreateTimeCapsuleView } from './CreateTimeCapsuleView';
import { LegacyGuardianCapsuleView } from './LegacyGuardianCapsuleView';
import {
  Lock,
  Unlock,
  Clock,
  Smile,
  Plus,
  Search,
  Filter,
  Calendar,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Play,
  Pause,
  Trash2,
  Paperclip,
  Camera,
  MapPin,
  HelpCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertTriangle,
  Flame,
  Frown,
  Moon,
  Target,
  Compass,
  Zap,
  Radio,
  FileText,
  Volume2,
  LifeBuoy
} from 'lucide-react';

interface TimeCapsulesViewProps {
  userId?: string;
  capsules: TimeCapsule[];
  onAddCapsule: (capsule: Omit<TimeCapsule, 'id' | 'userId' | 'sealedAt' | 'isOpened' | 'integrityHash'>) => void;
  onUnlockCapsule: (id: string) => void;
  onDeleteCapsule: (id: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

type CapsuleFilter = 'all' | 'sealed' | 'ready' | 'opened' | 'time' | 'mood';
type CapsuleSubTab = 'personal' | 'deadman';

export const TimeCapsulesView: React.FC<TimeCapsulesViewProps> = ({
  userId = 'default_user',
  capsules,
  onAddCapsule,
  onUnlockCapsule,
  onDeleteCapsule,
  showToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<CapsuleSubTab>('personal');
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<CapsuleFilter>('all');

  // Active viewing/inspecting capsule
  const [inspectingCapsule, setInspectingCapsule] = useState<TimeCapsule | null>(null);

  // Mood Calibration Modal State (for unlocking mood-locked capsules)
  const [moodCheckInCapsule, setMoodCheckInCapsule] = useState<TimeCapsule | null>(null);
  const [selectedCurrentMood, setSelectedCurrentMood] = useState<MoodType | null>(null);

  // AI Temporal Reflection State
  const [aiReflection, setAiReflection] = useState<{ [capsuleId: string]: string }>({});
  const [isLoadingAi, setIsLoadingAi] = useState<{ [capsuleId: string]: boolean }>({});

  // Audio Playback in unsealed view
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Live timer tick every second for real-time countdown updates
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper to check if time condition is met
  const isTimeConditionMet = (c: TimeCapsule): boolean => {
    if (!c.unlockDate) return true;
    return now >= new Date(c.unlockDate).getTime();
  };

  // Helper to check if capsule is ready to be unsealed
  const isReadyToUnseal = (c: TimeCapsule): boolean => {
    if (c.isOpened) return false;
    if (c.lockType === 'time') {
      return isTimeConditionMet(c);
    }
    if (c.lockType === 'mood') {
      // Ready for mood check-in any time
      return true;
    }
    if (c.lockType === 'both') {
      return isTimeConditionMet(c);
    }
    return false;
  };

  // Format countdown string
  const formatCountdown = (unlockDateStr?: string): { text: string; isPast: boolean } => {
    if (!unlockDateStr) return { text: 'No Time Lock', isPast: true };
    const target = new Date(unlockDateStr).getTime();
    const diff = target - now;

    if (diff <= 0) {
      return { text: 'Time Lock Expired (Ready to Open)', isPast: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      return { text: `${days}d ${hours}h ${minutes}m ${seconds}s`, isPast: false };
    }
    if (hours > 0) {
      return { text: `${hours}h ${minutes}m ${seconds}s`, isPast: false };
    }
    return { text: `${minutes}m ${seconds}s`, isPast: false };
  };

  // Filtered Capsules List
  const filteredCapsules = useMemo(() => {
    return capsules.filter((c) => {
      // Search
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.isOpened && c.message.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.locationTag && c.locationTag.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Filter
      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'sealed') return !c.isOpened && !isReadyToUnseal(c);
      if (selectedFilter === 'ready') return !c.isOpened && isReadyToUnseal(c);
      if (selectedFilter === 'opened') return c.isOpened;
      if (selectedFilter === 'time') return c.lockType === 'time' || c.lockType === 'both';
      if (selectedFilter === 'mood') return c.lockType === 'mood' || c.lockType === 'both';

      return true;
    });
  }, [capsules, searchQuery, selectedFilter, now]);

  // Counts for Stats Chips
  const stats = useMemo(() => {
    const total = capsules.length;
    const opened = capsules.filter((c) => c.isOpened).length;
    const ready = capsules.filter((c) => !c.isOpened && isReadyToUnseal(c)).length;
    const sealed = capsules.filter((c) => !c.isOpened && !isReadyToUnseal(c)).length;
    return { total, opened, ready, sealed };
  }, [capsules, now]);

  // Handle Unseal Trigger
  const handleAttemptUnseal = (capsule: TimeCapsule) => {
    if (capsule.lockType === 'mood' || capsule.lockType === 'both') {
      if (capsule.lockType === 'both' && !isTimeConditionMet(capsule)) {
        showToast('⏰ Time Lock condition has not been met yet.', 'warning');
        return;
      }
      // Open Mood Calibration Check-In
      setMoodCheckInCapsule(capsule);
      setSelectedCurrentMood(null);
    } else {
      // Pure Time Lock
      if (!isTimeConditionMet(capsule)) {
        showToast('⏰ Time Lock condition has not been met yet.', 'warning');
        return;
      }
      onUnlockCapsule(capsule.id);
      showToast('✨ Future Capsule decrypted & unsealed successfully!', 'success');
      setInspectingCapsule({ ...capsule, isOpened: true, openedAt: new Date().toISOString() });
    }
  };

  // Confirm Mood Check-In to unlock
  const handleConfirmMoodUnlock = () => {
    if (!moodCheckInCapsule || !selectedCurrentMood) return;

    if (moodCheckInCapsule.targetMood && selectedCurrentMood !== moodCheckInCapsule.targetMood) {
      showToast(
        `Emotional calibration mismatch: Capsule is locked for "${moodCheckInCapsule.targetMood.toUpperCase()}" state. You selected "${selectedCurrentMood.toUpperCase()}".`,
        'warning'
      );
      return;
    }

    onUnlockCapsule(moodCheckInCapsule.id);
    showToast('🎭 Mood calibration verified! Future Capsule decrypted and unsealed.', 'success');
    const updated = { ...moodCheckInCapsule, isOpened: true, openedAt: new Date().toISOString() };
    setMoodCheckInCapsule(null);
    setInspectingCapsule(updated);
  };

  // AI Temporal Reflection Generator
  const handleGenerateAiReflection = async (capsule: TimeCapsule) => {
    setIsLoadingAi((prev) => ({ ...prev, [capsule.id]: true }));
    try {
      const response = await authenticatedFetch('/api/functions/chatWithGemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Please act as a wise, empathetic temporal psychologist and life coach. The user wrote the following message to their future self in a cryptographically sealed Future Capsule on ${new Date(capsule.sealedAt).toLocaleDateString()} with target lock "${capsule.lockType}".\n\nPast Message:\n"""\n${capsule.message}\n"""\n\nNow, the user is unsealing this capsule today on ${new Date().toLocaleDateString()}.\n\nProvide a profound, structured "Temporal Reflection Synthesis" that:\n1. Acknowledges where the author was emotionally and mentally when they sealed this.\n2. Highlights the core wisdom, resilience, or intentions they set.\n3. Offers 2 thoughtful questions or affirmations to help them integrate what they've learned since then. Keep it concise, inspiring, and elegant.`,
        }),
      });

      const data = await response.json();
      if (data.reply) {
        setAiReflection((prev) => ({ ...prev, [capsule.id]: data.reply }));
        showToast('✨ Temporal AI reflection synthesized.', 'success');
      } else {
        throw new Error('Could not generate reflection');
      }
    } catch (err: any) {
      setAiReflection((prev) => ({
        ...prev,
        [capsule.id]: `Reflecting on your past note from ${new Date(capsule.sealedAt).toLocaleDateString()}: Your commitment to growth and mindful focus is clear. Notice how much has evolved since you sealed these words, yet your core intentions remain steadfast.`,
      }));
      showToast('Generated local reflection synthesis.', 'info');
    } finally {
      setIsLoadingAi((prev) => ({ ...prev, [capsule.id]: false }));
    }
  };

  // Render Create View
  if (isCreating) {
    return (
      <CreateTimeCapsuleView
        onBack={() => setIsCreating(false)}
        onSealCapsule={onAddCapsule}
        showToast={showToast}
      />
    );
  }

  return (
    <div
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        width: '100%',
        padding: '0 16px 48px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Top Banner & Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '16px 0',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: activeSubTab === 'deadman' ? 'rgba(217, 48, 37, 0.12)' : 'rgba(26, 115, 232, 0.12)',
                border: activeSubTab === 'deadman' ? '1px solid rgba(217, 48, 37, 0.25)' : '1px solid rgba(26, 115, 232, 0.25)',
                color: activeSubTab === 'deadman' ? 'var(--red)' : 'var(--blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              {activeSubTab === 'deadman' ? <LifeBuoy className="w-5 h-5 text-red-500" /> : <Clock className="w-5 h-5 text-blue-500" />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1
                  style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: 0,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {activeSubTab === 'deadman' ? 'Nexus Legacy Guardian' : 'Nexus Mind Future Capsules'}
                </h1>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: activeSubTab === 'deadman' ? '#f87171' : '#8ab4f8',
                    background: activeSubTab === 'deadman' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(26, 115, 232, 0.15)',
                    padding: '2px 8px',
                    borderRadius: '100px',
                    border: `1px solid ${activeSubTab === 'deadman' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(26, 115, 232, 0.3)'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {activeSubTab === 'deadman' ? '🛡️ Heartbeat Continuity Enclave' : '🔒 Zero-Knowledge Sealed'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '3px 0 0 0', lineHeight: 1.45 }}>
                {activeSubTab === 'deadman'
                  ? 'Automated cryptographic fail-safe for sovereign digital continuity. Dispatches encrypted vault directives, personal memoirs, and critical assets to designated guardians if your check-in pulse lapses.'
                  : 'Cryptographically sealed transmissions to your future consciousness. Encrypted thought-states and media locked until predetermined temporal epochs or emotional milestones are met.'}
              </p>
            </div>
          </div>
        </div>

        {/* SubTab Segmented Switcher & Primary Action */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            flexWrap: 'wrap',
            marginLeft: 'auto',
          }}
        >
          <div
            className="vault-nav-menu"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'var(--bg-sidebar)',
              padding: '3px 6px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              className="btn"
              onClick={() => setActiveSubTab('personal')}
              style={{
                borderRadius: 'var(--radius-pill)',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: activeSubTab === 'personal' ? 600 : 500,
                background: activeSubTab === 'personal' ? 'var(--blue)' : 'transparent',
                color: activeSubTab === 'personal' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                boxShadow: activeSubTab === 'personal' ? '0 1px 3px rgba(60,64,67,0.3)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Future Capsules ({capsules.length})</span>
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => setActiveSubTab('deadman')}
              style={{
                borderRadius: 'var(--radius-pill)',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: activeSubTab === 'deadman' ? 600 : 500,
                background: activeSubTab === 'deadman' ? 'var(--red)' : 'transparent',
                color: activeSubTab === 'deadman' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                boxShadow: activeSubTab === 'deadman' ? '0 1px 3px rgba(217,48,37,0.3)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Legacy Guardian</span>
            </button>
          </div>

          {activeSubTab === 'personal' && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="btn btn-primary"
              style={{
                fontSize: '13px',
                padding: '8px 18px',
                marginLeft: 'auto',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Create Future Capsule</span>
            </button>
          )}
        </div>
      </div>

      {/* RENDER NEXUS LEGARD GUARDIAN VIEW */}
      {activeSubTab === 'deadman' ? (
        <LegacyGuardianCapsuleView userId={userId} showToast={showToast} />
      ) : (
        <>

      {/* Stats Cards Bar (Google Web App Style) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Stat 1: Sealed */}
        <div
          onClick={() => setSelectedFilter('sealed')}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid',
            borderColor: selectedFilter === 'sealed' ? '#f59e0b' : 'var(--border-subtle)',
            borderRadius: '16px',
            padding: '14px 18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Sealed in Time
            </span>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#f59e0b', marginTop: '2px' }}>
              {stats.sealed}
            </div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock className="w-4 h-4" />
          </div>
        </div>

        {/* Stat 2: Ready to Open */}
        <div
          onClick={() => setSelectedFilter('ready')}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid',
            borderColor: selectedFilter === 'ready' ? '#10b981' : 'var(--border-subtle)',
            borderRadius: '16px',
            padding: '14px 18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Ready to Decrypt
            </span>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>
              {stats.ready}
            </div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        {/* Stat 3: Unsealed Archives */}
        <div
          onClick={() => setSelectedFilter('opened')}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid',
            borderColor: selectedFilter === 'opened' ? '#38bdf8' : 'var(--border-subtle)',
            borderRadius: '16px',
            padding: '14px 18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Unsealed Reflections
            </span>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
              {stats.opened}
            </div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Unlock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter Chips & Search Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: 'var(--bg-card)',
          padding: '10px 14px',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Filter Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {(
            [
              { id: 'all', label: 'All Capsules' },
              { id: 'sealed', label: '🔒 Sealed' },
              { id: 'ready', label: '✨ Ready to Decrypt' },
              { id: 'opened', label: '📜 Unsealed' },
              { id: 'time', label: '⏰ Time Locked' },
              { id: 'mood', label: '🎭 Mood Locked' },
            ] as Array<{ id: CapsuleFilter; label: string }>
          ).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setSelectedFilter(filter.id)}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '5px 12px',
                borderRadius: '100px',
                border: '1px solid',
                borderColor: selectedFilter === filter.id ? 'var(--accent-blue)' : 'var(--border-subtle)',
                background: selectedFilter === filter.id ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-main)',
                color: selectedFilter === filter.id ? '#60a5fa' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '220px' }}>
          <Search className="w-3.5 h-3.5" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search capsules..."
            style={{
              width: '100%',
              fontSize: '12.5px',
              padding: '6px 12px 6px 30px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '100px',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Capsules Grid */}
      {filteredCapsules.length === 0 ? (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px dashed var(--border-subtle)',
            borderRadius: '20px',
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(245, 158, 11, 0.1)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock className="w-7 h-7" />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            No Future Capsules Found
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '400px', margin: 0 }}>
            {searchQuery
              ? 'No future capsules match your current search query.'
              : 'Write a note to your future self. Seal it with a date, emotional trigger, or voice memo.'}
          </p>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="btn btn-primary"
            style={{ marginTop: '8px', padding: '8px 18px', borderRadius: '12px', fontSize: '13px' }}
          >
            <Lock className="w-3.5 h-3.5 inline mr-1.5" />
            <span>Create First Future Capsule</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredCapsules.map((capsule) => {
            const ready = isReadyToUnseal(capsule);
            const isOpened = capsule.isOpened;
            const countdown = formatCountdown(capsule.unlockDate);

            return (
              <div
                key={capsule.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid',
                  borderColor: isOpened
                    ? 'rgba(56, 189, 248, 0.3)'
                    : ready
                    ? 'rgba(16, 185, 129, 0.4)'
                    : 'rgba(245, 158, 11, 0.25)',
                  borderRadius: '18px',
                  padding: '20px',
                  boxShadow: ready
                    ? '0 4px 20px rgba(16, 185, 129, 0.15)'
                    : '0 4px 16px rgba(0, 0, 0, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Top Header & Badges */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isOpened ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#38bdf8',
                            background: 'rgba(56, 189, 248, 0.15)',
                            padding: '2px 8px',
                            borderRadius: '100px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Unlock className="w-3 h-3" /> Unsealed
                        </span>
                      ) : ready ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#34d399',
                            background: 'rgba(16, 185, 129, 0.15)',
                            padding: '2px 8px',
                            borderRadius: '100px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Sparkles className="w-3 h-3" /> Ready to Decrypt
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#f59e0b',
                            background: 'rgba(245, 158, 11, 0.15)',
                            padding: '2px 8px',
                            borderRadius: '100px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Lock className="w-3 h-3" /> Cryptographically Sealed
                        </span>
                      )}

                      {/* Lock Type Tag */}
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          background: 'var(--bg-main)',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {capsule.lockType === 'both' ? '⏰+🎭 Dual Lock' : capsule.lockType === 'time' ? '⏰ Time Lock' : '🎭 Mood Lock'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteCapsule(capsule.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                      title="Delete Capsule"
                    >
                      <Trash2 className="w-3.5 h-3.5 hover:text-rose-400" />
                    </button>
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontSize: '15.5px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      margin: '0 0 6px 0',
                      lineHeight: '1.4',
                    }}
                  >
                    {capsule.title}
                  </h3>

                  {/* Sealed Date & Location */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>Sealed {new Date(capsule.sealedAt).toLocaleDateString()}</span>
                    {capsule.locationTag && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#34d399' }}>
                        <MapPin className="w-3 h-3" /> {capsule.locationTag}
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Content Preview / Cryptographic Locked Mask */}
                <div
                  style={{
                    background: 'var(--bg-main)',
                    borderRadius: '12px',
                    padding: '14px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {isOpened ? (
                    <div>
                      <p
                        style={{
                          fontSize: '13px',
                          color: 'var(--text-secondary)',
                          lineHeight: '1.6',
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {capsule.message}
                      </p>
                      {/* Attached media indicators */}
                      <div style={{ display: 'flex', gap: '10px', marginTop: '8px', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {capsule.photos && capsule.photos.length > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#38bdf8' }}>
                            <Camera className="w-3 h-3" /> {capsule.photos.length} photos
                          </span>
                        )}
                        {capsule.audioUrl && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f43f5e' }}>
                            <Volume2 className="w-3 h-3" /> Voice note
                          </span>
                        )}
                        {capsule.attachments && capsule.attachments.length > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f59e0b' }}>
                            <Paperclip className="w-3 h-3" /> {capsule.attachments.length} files
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Cryptographic Shield Animation */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#f59e0b', letterSpacing: '1px' }}>
                          0x{capsule.integrityHash.slice(7, 19)}...
                        </span>
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      </div>

                      {/* Locked Content Mask */}
                      <div
                        style={{
                          background: 'rgba(0,0,0,0.3)',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          fontSize: '11.5px',
                          color: 'var(--text-muted)',
                          fontFamily: 'monospace',
                          filter: 'blur(2.5px)',
                          userSelect: 'none',
                          lineHeight: '1.4',
                        }}
                      >
                        [ZERO-KNOWLEDGE CIPHERTEXT] Message payload protected by client-isolated cryptographic seal. Decryption strictly barred until unlock conditions.
                      </div>

                      {/* Remaining condition trigger info */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                        {capsule.unlockDate && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>⏳ Time Countdown:</span>
                            <span style={{ fontWeight: 700, color: countdown.isPast ? '#10b981' : '#f59e0b' }}>
                              {countdown.text}
                            </span>
                          </div>
                        )}
                        {capsule.targetMood && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>🎭 Target Mood State:</span>
                            <span style={{ fontWeight: 700, color: '#c084fc', textTransform: 'capitalize' }}>
                              {capsule.targetMood}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  {isOpened ? (
                    <button
                      type="button"
                      onClick={() => setInspectingCapsule(capsule)}
                      className="btn btn-secondary"
                      style={{
                        width: '100%',
                        padding: '8px 14px',
                        borderRadius: '12px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Read Reflection</span>
                    </button>
                  ) : ready ? (
                    <button
                      type="button"
                      onClick={() => handleAttemptUnseal(capsule)}
                      className="btn"
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '8px 14px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Unseal &amp; Decrypt Now</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setInspectingCapsule(capsule)}
                      className="btn btn-secondary"
                      style={{
                        width: '100%',
                        padding: '8px 14px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        opacity: 0.85,
                      }}
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Inspect Lock Status</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Google Material 3 Modal 1: Inspect Capsule / Read Decrypted Letter Modal */}
      {inspectingCapsule && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            padding: '16px',
          }}
        >
          <div
            className="google-popup"
            style={{
              width: '680px',
              maxWidth: '94vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setInspectingCapsule(null)}
              className="popup-close"
              title="Close"
            >
              ✕
            </button>

            {/* Topic Status Chip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              {inspectingCapsule.isOpened ? (
                <div className="topic-chip" style={{ color: 'var(--md-success)', background: 'var(--md-surface-container)' }}>
                  <Unlock className="w-3.5 h-3.5 mr-1 inline" /> Decrypted &amp; Unsealed
                </div>
              ) : (
                <div className="topic-chip" style={{ color: 'var(--accent-amber)', background: 'var(--md-surface-container)' }}>
                  <Lock className="w-3.5 h-3.5 mr-1 inline" /> Sealed Future Capsule
                </div>
              )}

              <span style={{ fontSize: '12px', color: 'var(--md-on-surface-variant)' }}>
                Sealed {new Date(inspectingCapsule.sealedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {/* Popup Title */}
            <h2 className="popup-title" style={{ marginTop: '10px' }}>
              {inspectingCapsule.title}
            </h2>

            {/* If Unsealed: Show Message, Photos, Audio, AI Reflection */}
            {inspectingCapsule.isOpened ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                {/* Decrypted Note Body (M3 Context Card) */}
                <div className="context-card" style={{ fontSize: '15px', lineHeight: '1.75', whiteSpace: 'pre-wrap', margin: 0, padding: '20px' }}>
                  {inspectingCapsule.message}
                </div>

                {/* Voice Note Player if present */}
                {inspectingCapsule.audioUrl && (
                  <div
                    className="info-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--md-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Volume2 className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--md-on-surface)', display: 'block' }}>
                          Voice Note from Past Self
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--md-on-surface-variant)' }}>
                          Recorded on {new Date(inspectingCapsule.sealedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <audio controls src={inspectingCapsule.audioUrl} style={{ maxHeight: '36px' }} />
                  </div>
                )}

                {/* Photo Gallery if present */}
                {inspectingCapsule.photos && inspectingCapsule.photos.length > 0 && (
                  <div>
                    <div className="context-title" style={{ marginTop: '8px', marginBottom: '8px' }}>
                      Attached Memories &amp; Photos ({inspectingCapsule.photos.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                      {inspectingCapsule.photos.map((photo, i) => (
                        <div key={i} style={{ borderRadius: '16px', overflow: 'hidden', height: '130px', border: '1px solid var(--border-subtle)' }}>
                          <img src={photo} alt={`Memory ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attached Documents if present */}
                {inspectingCapsule.attachments && inspectingCapsule.attachments.length > 0 && (
                  <div>
                    <div className="context-title" style={{ marginTop: '8px', marginBottom: '8px' }}>
                      Attached Documents ({inspectingCapsule.attachments.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {inspectingCapsule.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="topic-chip"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          <span>{att.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Temporal Reflection Box (M3 High Container) */}
                <div
                  className="info-card"
                  style={{
                    background: 'var(--md-surface-container-high)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--md-primary)' }}>
                        Temporal AI Reflection Synthesis
                      </span>
                    </div>

                    {!aiReflection[inspectingCapsule.id] && (
                      <button
                        type="button"
                        onClick={() => handleGenerateAiReflection(inspectingCapsule)}
                        disabled={isLoadingAi[inspectingCapsule.id]}
                        className="btn-filled"
                        style={{ height: '34px', padding: '0 16px', fontSize: '12px' }}
                      >
                        {isLoadingAi[inspectingCapsule.id] ? 'Synthesizing...' : 'Generate AI Reflection'}
                      </button>
                    )}
                  </div>

                  {aiReflection[inspectingCapsule.id] ? (
                    <div style={{ fontSize: '13.5px', lineHeight: '1.7', color: 'var(--md-on-surface)', whiteSpace: 'pre-wrap' }}>
                      {aiReflection[inspectingCapsule.id]}
                    </div>
                  ) : (
                    <p style={{ fontSize: '12.5px', color: 'var(--md-on-surface-variant)', margin: 0 }}>
                      Synthesize insights on how much you have grown since writing this note in the past.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* If Sealed & Locked: Show Tamper-Proof Lock Shield */
              <div
                style={{
                  marginTop: '18px',
                  background: 'var(--md-surface-container)',
                  borderRadius: '22px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '16px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '24px',
                    background: 'var(--md-surface)',
                    color: 'var(--accent-amber)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow)',
                  }}
                >
                  <Lock className="w-8 h-8" />
                </div>

                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--md-on-surface)' }}>
                    Cryptographically Locked Capsule
                  </h3>
                  <p style={{ fontSize: '13.5px', color: 'var(--md-on-surface-variant)', maxWidth: '440px', margin: 0, lineHeight: 1.5 }}>
                    Till the conditions are met, this capsule will never open and reveal its contents.
                  </p>
                </div>

                {/* Lock Requirements Info Grid */}
                <div className="info-grid" style={{ width: '100%', margin: 0 }}>
                  {inspectingCapsule.unlockDate && (
                    <div className="info-card" style={{ textAlign: 'left' }}>
                      <div className="info-label">⏰ Time Condition</div>
                      <div className="info-value frequency" style={{ fontSize: '12.5px' }}>
                        {new Date(inspectingCapsule.unlockDate).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {inspectingCapsule.targetMood && (
                    <div className="info-card" style={{ textAlign: 'left' }}>
                      <div className="info-label">🎭 Mood Requirement</div>
                      <div className="info-value tone" style={{ textTransform: 'capitalize' }}>
                        {inspectingCapsule.targetMood}
                      </div>
                    </div>
                  )}
                </div>

                {isReadyToUnseal(inspectingCapsule) && (
                  <button
                    type="button"
                    onClick={() => {
                      setInspectingCapsule(null);
                      handleAttemptUnseal(inspectingCapsule);
                    }}
                    className="btn-filled"
                    style={{
                      background: 'var(--md-success)',
                      color: '#ffffff',
                      height: '44px',
                      padding: '0 32px',
                    }}
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Unlock &amp; Decrypt Now</span>
                  </button>
                )}
              </div>
            )}

            {/* Popup Bottom Actions */}
            <div className="popup-actions" style={{ marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setInspectingCapsule(null)}
                className="btn-text"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Material 3 Modal 2: 🎭 Mood Calibration Check-In Modal */}
      {moodCheckInCapsule && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            className="google-popup"
            style={{
              width: '520px',
              padding: '28px',
            }}
          >
            <button
              type="button"
              onClick={() => setMoodCheckInCapsule(null)}
              className="popup-close"
              title="Close"
            >
              ✕
            </button>

            <div className="topic-chip">
              <Smile className="w-3.5 h-3.5 mr-1" /> Emotional Calibration
            </div>

            <h3 className="popup-title">
              Verify Emotional State
            </h3>

            <p className="popup-subtitle">
              Verify your current emotional state to calibrate seal release.
            </p>

            <div className="info-card" style={{ marginTop: '16px' }}>
              <div className="info-label">Capsule Condition Target</div>
              <div className="info-value tone" style={{ fontSize: '15px' }}>
                "{moodCheckInCapsule.targetMood?.toUpperCase()}"
              </div>
              {moodCheckInCapsule.moodUnlockPrompt && (
                <p style={{ fontSize: '12.5px', color: 'var(--md-on-surface-variant)', margin: '6px 0 0 0', fontStyle: 'italic' }}>
                  "{moodCheckInCapsule.moodUnlockPrompt}"
                </p>
              )}
            </div>

            <div style={{ marginTop: '18px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--md-on-surface)', marginBottom: '10px' }}>
                Select your authentic emotional state right now:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {(
                  [
                    { type: 'calm', label: 'Calm & Peaceful' },
                    { type: 'focused', label: 'Deep Focus' },
                    { type: 'creative', label: 'Creative Spark' },
                    { type: 'anxious', label: 'Anxious / Overwhelmed' },
                    { type: 'energetic', label: 'High Energy' },
                    { type: 'tired', label: 'Fatigued / Low Battery' },
                  ] as Array<{ type: MoodType; label: string }>
                ).map((m) => {
                  const isSelected = selectedCurrentMood === m.type;
                  return (
                    <button
                      key={m.type}
                      type="button"
                      onClick={() => setSelectedCurrentMood(m.type)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '16px',
                        border: `1.5px solid ${isSelected ? 'var(--md-primary)' : 'var(--border-subtle)'}`,
                        background: isSelected ? 'var(--md-primary-container)' : 'var(--md-surface-container)',
                        color: isSelected ? 'var(--md-on-primary-container)' : 'var(--md-on-surface)',
                        fontSize: '12.5px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="popup-actions" style={{ marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setMoodCheckInCapsule(null)}
                className="btn-text"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedCurrentMood}
                onClick={handleConfirmMoodUnlock}
                className="btn-filled"
                style={{
                  opacity: selectedCurrentMood ? 1 : 0.5,
                  cursor: selectedCurrentMood ? 'pointer' : 'not-allowed',
                }}
              >
                Verify &amp; Unseal
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
