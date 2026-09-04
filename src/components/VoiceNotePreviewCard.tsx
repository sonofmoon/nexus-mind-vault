import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Download,
  Trash2,
  Mic,
  Volume2,
  VolumeX,
} from 'lucide-react';

export interface VoiceNotePreviewCardProps {
  audioUrl: string;
  durationSeconds?: number;
  fileName?: string;
  onDelete: () => void;
  onReRecord?: () => void;
  className?: string;
}

// 28 deterministic heights representing natural vocal harmonics
const WAVEFORM_BARS = [
  14, 22, 28, 18, 32, 40, 26, 16, 30, 36, 32, 20, 42, 48, 28, 20,
  34, 26, 18, 30, 38, 24, 16, 24, 32, 28, 18, 14,
];

export const VoiceNotePreviewCard: React.FC<VoiceNotePreviewCardProps> = ({
  audioUrl,
  durationSeconds = 0,
  fileName,
  onDelete,
  onReRecord,
  className = '',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrubberRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(durationSeconds);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Sync duration fallback when durationSeconds changes
  useEffect(() => {
    if (durationSeconds > 0) {
      setDuration((prev) => (isFinite(prev) && prev > 0 ? prev : durationSeconds));
    }
  }, [durationSeconds]);

  // Audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    setCurrentTime(0);
    setIsPlaying(false);

    if (durationSeconds > 0) {
      setDuration(durationSeconds);
    }

    const handleLoadedMetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      } else if (durationSeconds > 0) {
        setDuration(durationSeconds);
      }
    };

    const handleDurationChange = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audio) audio.currentTime = 0;
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    // Sync audio source
    try {
      if (audio.src !== audioUrl) {
        audio.src = audioUrl;
      }
    } catch {}

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audio.pause();
    };
  }, [audioUrl]);

  const effectiveDuration = isFinite(duration) && duration > 0 ? duration : durationSeconds || 0;

  // Formatting helper (mm:ss)
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
    const totalSecs = Math.floor(seconds);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        // Ensure source is assigned if missing
        if (!audio.src) {
          audio.src = audioUrl;
        }

        // If at end of track, rewind to start
        if (currentTime >= effectiveDuration && effectiveDuration > 0) {
          audio.currentTime = 0;
          setCurrentTime(0);
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        setIsPlaying(true);
      }
    } catch (err: any) {
      console.warn('[VoiceNotePreviewCard] Playback error notice:', err?.message || err);
      setIsPlaying(false);
    }
  };

  const seekRelative = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const maxTarget = effectiveDuration > 0 ? effectiveDuration : (audio.duration || 60);
    const target = Math.max(0, Math.min(maxTarget, audio.currentTime + delta));
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const cyclePlaybackRate = () => {
    const rates = [1.0, 1.25, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleScrubberSeek = useCallback(
    (clientX: number) => {
      if (!scrubberRef.current || effectiveDuration <= 0) return;
      const rect = scrubberRef.current.getBoundingClientRect();
      const clickRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const targetTime = clickRatio * effectiveDuration;
      if (audioRef.current && isFinite(targetTime)) {
        try {
          audioRef.current.currentTime = targetTime;
        } catch {}
      }
      setCurrentTime(targetTime);
    },
    [effectiveDuration]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleScrubberSeek(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleScrubberSeek(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleScrubberSeek(e.touches[0].clientX);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      handleScrubberSeek(moveEvent.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  const handleDownload = () => {
    try {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = fileName || `Voice_Note_${new Date().toISOString().slice(0, 10)}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.warn('[VoiceNotePreviewCard] Download notice:', err);
    }
  };

  const progressPercent =
    effectiveDuration > 0 ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100)) : 0;

  return (
    <div
      id="voice-note-preview-card"
      className={`voice-note-preview-card ${className}`}
      style={{
        background: 'var(--surface-hover)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '16px 18px',
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* Off-screen Active Native Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        playsInline
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Header: Label, Icon & Time Tracker */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(26, 115, 232, 0.12)',
              color: '#1a73e8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Mic className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Voice Note Preview
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {fileName || 'Recorded Audio Note'}
            </div>
          </div>
        </div>

        {/* Time Stamp Badge */}
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            background: 'var(--surface)',
            padding: '4px 10px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            letterSpacing: '0.04em',
          }}
        >
          {formatTime(currentTime)} / {formatTime(effectiveDuration)}
        </div>
      </div>

      {/* Waveform Visualization Bars */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '38px',
          gap: '2.5px',
          padding: '0 6px',
          background: 'rgba(0, 0, 0, 0.025)',
          borderRadius: '10px',
          overflow: 'hidden',
        }}
      >
        {WAVEFORM_BARS.map((height, idx) => {
          const barRatio = (idx + 1) / WAVEFORM_BARS.length;
          const isPassed = barRatio <= progressPercent / 100;
          const dynamicScale = isPlaying && isPassed ? (idx % 2 === 0 ? 1.15 : 0.85) : 1;
          const barHeight = Math.min(34, Math.max(6, Math.round((height / 48) * 34 * dynamicScale)));

          return (
            <span
              key={idx}
              style={{
                flex: 1,
                minWidth: '2.5px',
                maxWidth: '6px',
                height: `${barHeight}px`,
                borderRadius: '3px',
                background: isPassed
                  ? 'linear-gradient(to top, #1a73e8, #4285f4)'
                  : 'var(--border)',
                opacity: isPassed ? 1 : 0.55,
                transition: 'height 0.1s ease, background 0.15s ease, opacity 0.15s ease',
              }}
            />
          );
        })}
      </div>

      {/* Interactive Progress Scrubber */}
      <div
        ref={scrubberRef}
        role="slider"
        aria-label="Voice note progress scrubber"
        aria-valuemin={0}
        aria-valuemax={effectiveDuration}
        aria-valuenow={currentTime}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          width: '100%',
          height: '22px',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          touchAction: 'none',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            background: 'var(--border)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #1a73e8, #4285f4)',
              borderRadius: '3px',
              transition: isDragging ? 'none' : 'width 0.08s linear',
            }}
          />
        </div>

        {/* Playhead Thumb */}
        <div
          style={{
            position: 'absolute',
            left: `calc(${progressPercent}% - 7px)`,
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: '#1a73e8',
            border: '2px solid #ffffff',
            boxShadow: '0 1px 5px rgba(26, 115, 232, 0.4)',
            pointerEvents: 'none',
            transition: isDragging ? 'none' : 'left 0.08s linear',
          }}
        />
      </div>

      {/* Controls Dock: Google-Ready Play Button & Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: '10px',
          flexWrap: 'wrap',
          paddingTop: '2px',
        }}
      >
        {/* Left: Google Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* 🌟 Google-Ready Play / Pause Button (M3 Floating Audio Action Button) */}
          <button
            id="btn-voice-preview-play"
            type="button"
            onClick={togglePlayPause}
            className="google-play-btn"
            aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: isPlaying
                ? '0 0 0 4px rgba(26, 115, 232, 0.25), 0 4px 14px rgba(26, 115, 232, 0.45)'
                : '0 2px 8px rgba(26, 115, 232, 0.35), 0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.18s cubic-bezier(0.4, 0, 0.2, 1), background 0.18s ease',
              flexShrink: 0,
            }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Seek -5s (Google Material Icon Button) */}
          <button
            type="button"
            onClick={() => seekRelative(-5)}
            className="google-icon-btn btn-ghost"
            style={{
              width: '34px',
              height: '34px',
              padding: 0,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              border: '1px solid transparent',
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
            title="Rewind 5 seconds"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Seek +5s (Google Material Icon Button) */}
          <button
            type="button"
            onClick={() => seekRelative(5)}
            className="google-icon-btn btn-ghost"
            style={{
              width: '34px',
              height: '34px',
              padding: 0,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              border: '1px solid transparent',
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
            title="Forward 5 seconds"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Google Pill Speed Selector */}
          <button
            type="button"
            onClick={cyclePlaybackRate}
            className="google-chip-btn"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '9999px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              transition: 'background 0.15s ease, border-color 0.15s ease',
            }}
            title="Change playback speed"
          >
            <span>{playbackRate}x</span>
          </button>

          {/* Mute Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className="google-icon-btn btn-ghost"
            style={{
              width: '34px',
              height: '34px',
              padding: 0,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              border: '1px solid transparent',
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Right: Actions (Re-record, Download, Discard) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onReRecord && (
            <button
              type="button"
              onClick={onReRecord}
              className="google-chip-action-btn"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '5px 12px',
                borderRadius: '9999px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'background 0.15s ease, border-color 0.15s ease, transform 0.1s ease',
              }}
              title="Discard current recording and record again"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
              <span>Re-record</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="google-icon-btn btn-ghost"
            style={{
              width: '34px',
              height: '34px',
              padding: 0,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
            title="Download audio recording (.webm)"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.pause();
              }
              setIsPlaying(false);
              onDelete();
            }}
            className="google-icon-btn btn-ghost"
            style={{
              width: '34px',
              height: '34px',
              padding: 0,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ea4335',
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
            title="Discard voice recording"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
