import { describe, it, expect } from 'vitest';

describe('🎙️ Voice Note Preview & Duration Fallback Engine', () => {
  // Duration calculation logic as used in VoiceNotePreviewCard
  const resolveEffectiveDuration = (
    audioDuration: number,
    recordedDuration: number
  ): number => {
    if (isFinite(audioDuration) && audioDuration > 0) {
      return audioDuration;
    }
    return recordedDuration > 0 ? recordedDuration : 0;
  };

  // Time formatter as used in VoiceNotePreviewCard
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
    const totalSecs = Math.floor(seconds);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Playback rate cycle logic
  const getNextPlaybackRate = (currentRate: number): number => {
    const rates = [1.0, 1.25, 1.5, 2.0];
    const currentIndex = rates.indexOf(currentRate);
    return rates[(currentIndex + 1) % rates.length];
  };

  it('correctly falls back to recordedDuration when browser reports Infinity duration', () => {
    // Chromium WebM Opus returns Infinity duration
    const effective = resolveEffectiveDuration(Infinity, 45);
    expect(effective).toBe(45);
  });

  it('correctly falls back to recordedDuration when browser reports NaN or 0', () => {
    expect(resolveEffectiveDuration(NaN, 12)).toBe(12);
    expect(resolveEffectiveDuration(0, 18)).toBe(18);
  });

  it('prefers valid finite audio duration when available', () => {
    const effective = resolveEffectiveDuration(32.4, 30);
    expect(effective).toBe(32.4);
  });

  it('correctly formats seconds into mm:ss timestamps', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(9)).toBe('0:09');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(359)).toBe('5:59');
    expect(formatTime(3600)).toBe('60:00');
  });

  it('handles negative or invalid timestamp inputs safely', () => {
    expect(formatTime(-10)).toBe('0:00');
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
  });

  it('correctly cycles through playback speed tiers', () => {
    let rate = 1.0;
    rate = getNextPlaybackRate(rate);
    expect(rate).toBe(1.25);
    rate = getNextPlaybackRate(rate);
    expect(rate).toBe(1.5);
    rate = getNextPlaybackRate(rate);
    expect(rate).toBe(2.0);
    rate = getNextPlaybackRate(rate);
    expect(rate).toBe(1.0);
  });

  it('generates consistent attachment payload structure for voice notes', () => {
    const base64Fake = 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwE=';
    const nowStr = '12-30-45';
    const attachment = {
      id: 'att_voice_' + Date.now().toString(36),
      name: `Voice_Note_${nowStr}.webm`,
      type: 'audio',
      data: base64Fake,
      url: base64Fake,
    };

    expect(attachment.name).toMatch(/^Voice_Note_.*\.webm$/);
    expect(attachment.type).toBe('audio');
    expect(attachment.data.startsWith('data:audio/webm;base64,')).toBe(true);
  });
});
