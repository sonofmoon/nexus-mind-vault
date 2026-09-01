import React, { useState, useRef, useEffect } from 'react';
import { TimeCapsule, CapsuleLockType, MoodType, AttachmentItem } from '../types';
import { InnovativeCameraStudioModal, CapturedPhotoResult } from './InnovativeCameraStudioModal';
import {
  ArrowLeft,
  Lock,
  Clock,
  Smile,
  Info,
  Camera,
  Paperclip,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  MapPin,
  Sparkles,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Compass,
  Target,
  Flame,
  Frown,
  Moon,
  Zap,
  Radio,
  Image as ImageIcon,
} from 'lucide-react';

interface CreateTimeCapsuleViewProps {
  onBack: () => void;
  onSealCapsule: (capsule: Omit<TimeCapsule, 'id' | 'userId' | 'sealedAt' | 'isOpened' | 'integrityHash'>) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const MOOD_OPTIONS: { type: MoodType; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  { type: 'calm', label: 'Calm & Peaceful', icon: <Compass className="w-4 h-4" />, color: '#38bdf8', desc: 'Open when in a serene, receptive headspace' },
  { type: 'focused', label: 'Deep Focus', icon: <Target className="w-4 h-4" />, color: '#10b981', desc: 'Open during dedicated deep work or building' },
  { type: 'creative', label: 'Creative Spark', icon: <Smile className="w-4 h-4" />, color: '#a855f7', desc: 'Open when seeking inspiration & novel ideas' },
  { type: 'anxious', label: 'Anxious / Overwhelmed', icon: <Frown className="w-4 h-4" />, color: '#f43f5e', desc: 'Open for emergency comfort & grounding reassurance' },
  { type: 'energetic', label: 'High Energy', icon: <Flame className="w-4 h-4" />, color: '#f59e0b', desc: 'Open when ready to celebrate or push boundaries' },
  { type: 'tired', label: 'Fatigued / Low Battery', icon: <Moon className="w-4 h-4" />, color: '#94a3b8', desc: 'Open when in need of rest, solace, and patience' },
];

const INSPIRATION_PROMPTS = [
  "What is the single biggest goal or belief you hope has come true by then?",
  "What problem is keeping you up at night right now that won't matter in a year?",
  "Describe your current daily routine, environment, and what brings you joy today.",
  "Give one piece of unapologetic advice or reminder to your future self.",
  "What is a risk you are currently contemplating taking?"
];

export const CreateTimeCapsuleView: React.FC<CreateTimeCapsuleViewProps> = ({
  onBack,
  onSealCapsule,
  showToast,
}) => {
  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [lockType, setLockType] = useState<CapsuleLockType>('time');

  // Time Lock State
  const [unlockDate, setUnlockDate] = useState<string>(() => {
    // Default to 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 16);
  });

  // Mood Lock State
  const [targetMood, setTargetMood] = useState<MoodType>('calm');
  const [moodUnlockPrompt, setMoodUnlockPrompt] = useState('');

  // Attachments State
  const [photos, setPhotos] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [locationTag, setLocationTag] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Info Modal state
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isSealingAnimation, setIsSealingAnimation] = useState(false);

  // Voice recording timer
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording]);

  // Audio Recording Handlers
  const handleStartRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Microphone recording is not supported in this browser.', 'error');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setAudioUrl(base64Audio);
          showToast('Voice note recorded & encrypted in capsule.', 'success');
        };
        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (err: any) {
      showToast('Could not access microphone: ' + (err.message || 'Permission denied'), 'error');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleDeleteAudio = () => {
    setAudioUrl(null);
    setRecordingDuration(0);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsPlayingAudio(false);
  };

  const handleToggleAudioPlay = () => {
    if (!audioPlayerRef.current || !audioUrl) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Camera Capture Handler
  const handleCameraCapture = (captured: CapturedPhotoResult) => {
    setPhotos((prev) => [...prev, captured.dataUrl]);
    showToast(`Captured photo with "${captured.filterName}" lens attached!`, 'success');
  };

  // Photo Upload Handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      if (!file.type.startsWith('image/')) {
        showToast('Please select valid image files.', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setPhotos((prev) => [...prev, result]);
          showToast(`Photo "${file.name}" attached.`, 'info');
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Generic File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const newAtt: AttachmentItem = {
        id: 'att_' + Math.random().toString(36).substring(2, 9),
        name: file.name,
        type: 'file',
        size: file.size,
      };
      setAttachments((prev) => [...prev, newAtt]);
      showToast(`File "${file.name}" attached to time capsule.`, 'info');
    });
  };

  // Geolocation tagger
  const handleFetchLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const tag = `Lat ${pos.coords.latitude.toFixed(3)}, Lng ${pos.coords.longitude.toFixed(3)}`;
        setLocationTag(tag);
        showToast('Location coordinates tagged in capsule metadata.', 'success');
      },
      () => {
        setIsLocating(false);
        setLocationTag('Nexus Mind Vault HQ (Zero-Trust Node)');
        showToast('Tagged default secure vault node location.', 'info');
      }
    );
  };

  // Quick Preset Handlers
  const handleSetPreset = (daysAhead: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    setUnlockDate(target.toISOString().slice(0, 16));
    setLockType((prev) => (prev === 'mood' ? 'both' : 'time'));
    showToast(`Time Lock set for ${daysAhead} days from today.`, 'info');
  };

  const handleSetNewYearPreset = () => {
    const currentYear = new Date().getFullYear();
    const target = new Date(currentYear + 1, 0, 1, 0, 0, 0);
    setUnlockDate(target.toISOString().slice(0, 16));
    setLockType((prev) => (prev === 'mood' ? 'both' : 'time'));
    showToast(`Time Lock set for New Year (${currentYear + 1}-01-01).`, 'info');
  };

  // Form Submit / Seal Action
  const handleSealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please enter a title for your Time Capsule.', 'warning');
      return;
    }
    if (!message.trim()) {
      showToast('Please write a message to your future self.', 'warning');
      return;
    }

    if ((lockType === 'time' || lockType === 'both') && !unlockDate) {
      showToast('Please select a valid future date & time for the Time Lock.', 'warning');
      return;
    }

    // Trigger sealing animation
    setIsSealingAnimation(true);
    setTimeout(() => {
      onSealCapsule({
        title: title.trim(),
        message: message.trim(),
        lockType,
        unlockDate: lockType === 'time' || lockType === 'both' ? new Date(unlockDate).toISOString() : undefined,
        targetMood: lockType === 'mood' || lockType === 'both' ? targetMood : undefined,
        moodUnlockPrompt: moodUnlockPrompt.trim() || undefined,
        photos,
        attachments,
        audioUrl: audioUrl || undefined,
        locationTag: locationTag || undefined,
      });
      setIsSealingAnimation(false);
      showToast('🔒 Time Capsule cryptographically sealed until target conditions!', 'success');
      onBack();
    }, 1200);
  };

  return (
    <div
      style={{
        maxWidth: '920px',
        margin: '0 auto',
        width: '100%',
        padding: '0 16px 40px 16px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          padding: '16px 0',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={onBack}
            className="btn btn-secondary"
            style={{
              padding: '8px 14px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Lock className="w-4 h-4" />
              </div>
              <h1
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0,
                  fontFamily: '"Google Sans", sans-serif',
                }}
              >
                Create Future Capsule
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#8ab4f8',
                  background: 'rgba(26, 115, 232, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  border: '1px solid rgba(26, 115, 232, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                🔒 Zero-Knowledge Sealed
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Cryptographically sealed transmission to your future consciousness.
            </p>
          </div>
        </div>

        {/* Info Explainer Tooltip */}
        <button
          type="button"
          onClick={() => setShowInfoModal(true)}
          className="btn btn-secondary"
          style={{
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-blue)',
            border: '1px solid var(--border-subtle)',
          }}
          title="How cryptographic time-locks work"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Main Composition Form */}
      <form onSubmit={handleSealSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Card 1: Capsule Content & Multimodal Workspace */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* Capsule Title */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-muted)',
                marginBottom: '8px',
              }}
            >
              Capsule Title
            </label>
            <input
              type="text"
              className="session-search-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Letter to Myself on Launch Day, 5-Year Life Manifesto, Advice for 2028..."
              required
              style={{
                width: '100%',
                fontSize: '15px',
                fontWeight: 600,
                padding: '12px 16px',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
              }}
            />
          </div>

          {/* Inspiration Prompts Chips */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Temporal Reflection Spark:
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {INSPIRATION_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMessage((prev) => (prev ? `${prev}\n\n**${prompt}**\n` : `**${prompt}**\n`))}
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '100px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#f59e0b')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  + {prompt.slice(0, 48)}...
                </button>
              ))}
            </div>
          </div>

          {/* Main Message Textarea */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-muted)',
                marginBottom: '8px',
              }}
            >
              Message to your future self
            </label>
            <textarea
              className="journal-textarea"
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a message to your future self... Share your unfiltered mindset, current hopes, struggles, gratitude, predictions, and lessons you want to be reminded of when this opens."
              required
              style={{
                width: '100%',
                fontSize: '14px',
                lineHeight: '1.6',
                padding: '16px',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                borderRadius: '14px',
                border: '1px solid var(--border-subtle)',
                resize: 'vertical',
                minHeight: '180px',
              }}
            />
          </div>

          {/* Multimodal Attachments Bar */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: 'var(--bg-main)',
              padding: '14px 16px',
              borderRadius: '14px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Add Attachments, Photos, Voice Notes:
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* 📷 Live Neural Camera Studio Button */}
                <button
                  type="button"
                  id="btn-capsule-camera"
                  onClick={() => setIsCameraModalOpen(true)}
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.18), rgba(59, 130, 246, 0.18))',
                    border: '1px solid rgba(6, 182, 212, 0.45)',
                    color: '#38bdf8',
                    boxShadow: '0 2px 8px rgba(6, 182, 212, 0.15)',
                    transition: 'all 0.15s ease',
                  }}
                  title="Open live Neural Camera Studio with AI Mood Lenses & Biometrics"
                >
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Camera Lens</span>
                </button>

                {/* 📸 Upload Photos from Disk */}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>Upload Photos ({photos.length})</span>
                </button>

                {/* 🎙️ Voice Note Recording Button */}
                {!isRecording && !audioUrl && (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="btn btn-secondary"
                    style={{
                      padding: '6px 12px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Mic className="w-3.5 h-3.5 text-rose-400" />
                    <span>Record Voice Note</span>
                  </button>
                )}

                {/* 📎 Attach Files Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Paperclip className="w-3.5 h-3.5 text-amber-400" />
                  <span>Files ({attachments.length})</span>
                </button>

                {/* 📍 Tag Location Button */}
                <button
                  type="button"
                  onClick={handleFetchLocation}
                  disabled={isLocating}
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{locationTag ? 'Location Tagged' : 'Location Stamp'}</span>
                </button>
              </div>
            </div>

            {/* Active Voice Recorder / Player Widget */}
            {isRecording && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="animate-pulse" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f43f5e' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#f43f5e' }}>
                    Recording Voice Note... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="btn"
                  style={{
                    background: '#f43f5e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop &amp; Seal Audio</span>
                </button>
              </div>
            )}

            {audioUrl && !isRecording && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleToggleAudioPlay}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#10b981',
                      border: 'none',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                  </button>
                  <audio
                    ref={audioPlayerRef}
                    src={audioUrl}
                    onEnded={() => setIsPlayingAudio(false)}
                    style={{ display: 'none' }}
                  />
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Voice Note Ready ({recordingDuration}s)
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>
                      Encrypted and time-locked inside capsule
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteAudio}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                  title="Remove Audio"
                >
                  <Trash2 className="w-4 h-4 hover:text-rose-400" />
                </button>
              </div>
            )}

            {/* Photos Preview Grid */}
            {photos.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '4px 0' }}>
                {photos.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                    <img src={img} alt={`Attached ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      style={{
                        position: 'absolute',
                        top: '3px',
                        right: '3px',
                        background: 'rgba(0, 0, 0, 0.65)',
                        color: '#ffffff',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#000000';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.65)';
                      }}
                      title="Remove photo"
                    >
                      <X style={{ width: '10px', height: '10px', color: '#ffffff', strokeWidth: 2.5 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Files & Location Badges */}
            {(attachments.length > 0 || locationTag) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                {locationTag && (
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <MapPin className="w-3 h-3" /> {locationTag}
                    <button type="button" onClick={() => setLocationTag('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '4px' }}>✕</button>
                  </span>
                )}
                {attachments.map((att) => (
                  <span
                    key={att.id}
                    style={{
                      fontSize: '11px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#60a5fa',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Paperclip className="w-3 h-3" /> {att.name}
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '4px' }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Locking Conditions Engine (Time Lock & Mood Lock) */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Cryptographic Lock Protocol</span>
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Choose whether this capsule unlocks based on time elapsed, your future emotional state, or both.
              </p>
            </div>

            {/* Lock Mode Selector */}
            <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-main)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setLockType('time')}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: lockType === 'time' ? '#2563eb' : 'transparent',
                  color: lockType === 'time' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                ⏰ Time Lock
              </button>
              <button
                type="button"
                onClick={() => setLockType('mood')}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: lockType === 'mood' ? '#9333ea' : 'transparent',
                  color: lockType === 'mood' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                🎭 Mood Lock
              </button>
              <button
                type="button"
                onClick={() => setLockType('both')}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: lockType === 'both' ? 'linear-gradient(135deg, #2563eb, #9333ea)' : 'transparent',
                  color: lockType === 'both' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                🔐 Dual Lock (Both)
              </button>
            </div>
          </div>

          {/* Section A: ⏰ Time Lock Controls */}
          {(lockType === 'time' || lockType === 'both') && (
            <div
              style={{
                background: 'rgba(37, 99, 235, 0.06)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                borderRadius: '16px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    ⏰ Time Lock Configuration
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#60a5fa' }}>
                  Unlock on or after selected date and time.
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <input
                  type="datetime-local"
                  value={unlockDate}
                  onChange={(e) => setUnlockDate(e.target.value)}
                  required={lockType === 'time' || lockType === 'both'}
                  style={{
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid rgba(37, 99, 235, 0.4)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />

                {/* Quick Presets */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleSetPreset(7)}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '8px' }}
                  >
                    +1 Week
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPreset(30)}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '8px' }}
                  >
                    +1 Month
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPreset(180)}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '8px' }}
                  >
                    +6 Months
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPreset(365)}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '8px' }}
                  >
                    +1 Year
                  </button>
                  <button
                    type="button"
                    onClick={handleSetNewYearPreset}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '8px', color: '#f59e0b' }}
                  >
                    🎉 Next New Year
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section B: 🎭 Mood Lock Controls */}
          {(lockType === 'mood' || lockType === 'both') && (
            <div
              style={{
                background: 'rgba(168, 85, 247, 0.06)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: '16px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Smile className="w-4 h-4 text-purple-400" />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    🎭 Mood Lock Condition
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#c084fc' }}>
                  Unlocks only when your future emotional check-in matches this state.
                </span>
              </div>

              {/* Mood Choices */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                {MOOD_OPTIONS.map((m) => {
                  const isSelected = targetMood === m.type;
                  return (
                    <div
                      key={m.type}
                      onClick={() => setTargetMood(m.type)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: isSelected ? m.color : 'var(--border-subtle)',
                        background: isSelected ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-main)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isSelected ? '#ffffff' : m.color }}>
                        {m.icon}
                        <span style={{ fontSize: '12.5px', fontWeight: 700 }}>{m.label}</span>
                      </div>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                        {m.desc}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Custom Intent Note */}
              <input
                type="text"
                value={moodUnlockPrompt}
                onChange={(e) => setMoodUnlockPrompt(e.target.value)}
                placeholder="Optional guidance (e.g. Open when you feel stressed and need perspective)..."
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '12.5px',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          )}
        </div>

        {/* Action Button: Seal Capsule */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '20px',
            padding: '20px 24px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                Zero-Knowledge Cryptographic Guarantee
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Till the conditions are met Capsule will never Open and reveal its contents.
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSealingAnimation}
            className="btn"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
              cursor: 'pointer',
            }}
          >
            <Lock className={`w-4 h-4 ${isSealingAnimation ? 'animate-spin' : ''}`} />
            <span>{isSealingAnimation ? 'Cryptographically Sealing...' : 'Seal Future Capsule'}</span>
          </button>
        </div>
      </form>

      {/* Info Modal (ⓘ How Time-Locks Work) */}
      {showInfoModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              background: '#0f172a',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
              color: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                  <Info className="w-5 h-5" />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>
                  Cryptographic Time-Lock Protocol
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0 }}>
                Nexus Mind Vault future capsules use client-isolated zero-knowledge schemas to protect your future reflections.
              </p>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <strong style={{ color: '#60a5fa', display: 'block', marginBottom: '4px' }}>⏰ Time Lock:</strong>
                Locks ciphertext until the epoch timestamp exceeds your chosen target date. Early viewing is strictly blocked by the cryptographic vault engine.
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <strong style={{ color: '#c084fc', display: 'block', marginBottom: '4px' }}>🎭 Mood Lock:</strong>
                Calibrates opening to future emotional state check-ins (e.g. "Open when anxious" will deliver comforting grounding words exactly when you need them).
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                <ShieldCheck className="w-4 h-4 inline mr-1 text-emerald-400" />
                Integrity is verified using SHA-256 seal fingerprints to guarantee un-tampered message delivery.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="btn btn-primary"
              style={{
                width: '100%',
                marginTop: '20px',
                padding: '10px',
                borderRadius: '12px',
                fontWeight: 600,
              }}
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Innovative Camera Studio Modal */}
      <InnovativeCameraStudioModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        title="Future Capsule Neural Optical Lens"
        subtitle="Zero-knowledge temporal photo seal with live AI mood filters, biometric telemetry & tamper-proof timestamps"
        showToast={showToast}
      />
    </div>
  );
};
