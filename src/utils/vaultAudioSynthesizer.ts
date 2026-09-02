// Web Audio API Sound Synthesizer for Zero-Knowledge Vault Operations
// 100% native client-side synthesis: zero external audio assets or network latency

class VaultAudioSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Cinematic Quantum Decryption Disengage Sound: Sub-bass resonance + Harmonic chime
  public playUnlockSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Mechanical Sub-bass Heavy Thud (Magnetic lock disengage)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(90, now);
      subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);

      subOsc.start(now);
      subOsc.stop(now + 0.35);

      // 2. High-Tech Harmonic Chime Sweep (Aperture authorization)
      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chimeOsc.type = 'triangle';
      chimeOsc.frequency.setValueAtTime(520, now + 0.1);
      chimeOsc.frequency.exponentialRampToValueAtTime(1440, now + 0.45);

      chimeGain.gain.setValueAtTime(0.001, now);
      chimeGain.gain.setValueAtTime(0.25, now + 0.1);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(ctx.destination);

      chimeOsc.start(now + 0.1);
      chimeOsc.stop(now + 0.65);

      // 3. Shimmer Sparkle (Decrypted data stream)
      const shimmerOsc = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmerOsc.type = 'sine';
      shimmerOsc.frequency.setValueAtTime(2093, now + 0.25); // C7 note
      shimmerOsc.frequency.exponentialRampToValueAtTime(2793, now + 0.55); // F7 note

      shimmerGain.gain.setValueAtTime(0.001, now);
      shimmerGain.gain.setValueAtTime(0.18, now + 0.25);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      shimmerOsc.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);

      shimmerOsc.start(now + 0.25);
      shimmerOsc.stop(now + 0.7);
    } catch {
      // Audio autoplays gracefully handle without error
    }
  }

  // Tactical Panic Lock / Emergency Lockdown Tone
  public playPanicLockSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  // Soft Security Inactivity Warning Pulse
  public playWarningPulse(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(880, now + 0.1);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  playUnlockSuccess() {
    this.playUnlockSound();
  }

  playErrorBuzzer() {
    this.playPanicLockSound();
  }

  playKeypadBeep() {
    this.playKeyClick();
  }

  playKeyClick() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch {}
  }
}

export const vaultAudio = new VaultAudioSynthesizer();
