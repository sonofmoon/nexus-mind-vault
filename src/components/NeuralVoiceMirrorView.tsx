import React, { useState, useEffect, useRef, useCallback } from 'react';
import { JournalEntry, MoodType, TabType } from '../types';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Radio,
  RotateCcw,
  CheckCircle2,
  Shield,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Brain,
  Sliders,
  Share2,
  Pause,
  Play,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { streamGeminiChat } from '../services/geminiClient';
import {
  StreamingSentenceSpeaker,
  cancelAllSpeech,
  cleanTextForSpeech,
} from '../services/voiceSynthesisService';
import { vaultAudio } from '../utils/vaultAudioSynthesizer';
import { CognitiveBreakdownCard, CognitiveBreakdown } from './CognitiveBreakdownCard';

export interface NeuralVoiceMirrorViewProps {
  userId?: string;
  entries: JournalEntry[];
  onAddEntry: (entry: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onSelectTab?: (tab: TabType) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

interface DialogueTurn {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export type VoiceSessionState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused';

export const NeuralVoiceMirrorView: React.FC<NeuralVoiceMirrorViewProps> = ({
  userId,
  entries = [],
  onAddEntry,
  onSelectTab,
  showToast,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceSessionState>('idle');
  const [viewMode, setViewMode] = useState<'chamber' | 'breakdown'>('chamber');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [spectrumBars, setSpectrumBars] = useState<number[]>(new Array(24).fill(4));
  const [isMuted, setIsMuted] = useState(false);
  const [autoListenEnabled, setAutoListenEnabled] = useState(true);
  const [showDrawer, setShowDrawer] = useState(true);

  // Dialogue & Session State
  const [dialogue, setDialogue] = useState<DialogueTurn[]>([]);
  const [currentUserSpeech, setCurrentUserSpeech] = useState('');
  const [currentAiSpeech, setCurrentAiSpeech] = useState('');
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [cognitiveBreakdown, setCognitiveBreakdown] = useState<CognitiveBreakdown | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  // Audio & Speech References
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const speakerRef = useRef<StreamingSentenceSpeaker | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const sessionTimerRef = useRef<any>(null);
  const isComponentMounted = useRef(true);
  const voiceStateRef = useRef<VoiceSessionState>(voiceState);
  const isMutedRef = useRef<boolean>(isMuted);
  const autoListenEnabledRef = useRef<boolean>(autoListenEnabled);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    autoListenEnabledRef.current = autoListenEnabled;
  }, [autoListenEnabled]);

  // Session Duration Timer (freezes when voiceState === 'paused')
  useEffect(() => {
    isComponentMounted.current = true;
    if (voiceState !== 'paused') {
      sessionTimerRef.current = setInterval(() => {
        setSessionSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    };
  }, [voiceState]);

  // Cleanup Web Audio & Speech on unmount
  const cleanupAudio = useCallback(() => {
    cancelAllSpeech();
    if (speakerRef.current) {
      speakerRef.current.cancel();
      speakerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      isComponentMounted.current = false;
      cleanupAudio();
    };
  }, [cleanupAudio]);

  // Real-Time 60 FPS Dynamic Acoustic Engine (User mic input & AI vocal prosody)
  useEffect(() => {
    const dataArray = new Uint8Array(32);

    const updateAcoustics = () => {
      if (!isComponentMounted.current) return;
      const state = voiceStateRef.current;

      if (state === 'paused') {
        setVolumeLevel(0.02);
        setSpectrumBars(new Array(24).fill(4));
      } else if (state === 'speaking') {
        // Dynamic multi-frequency vocal prosody simulating human speech cadence and syllables
        const time = performance.now() / 1000;
        const syllableWave =
          Math.sin(time * 7.5) * 0.35 +
          Math.sin(time * 3.2) * 0.3 +
          Math.sin(time * 12.0) * 0.15;
        const vocalEnergy = Math.max(0.18, Math.min(0.95, 0.52 + syllableWave * 0.42));
        setVolumeLevel(vocalEnergy);

        const bars: number[] = [];
        for (let i = 0; i < 24; i++) {
          // Acoustic vocal formant peaking in mid-range frequencies
          const formantFactor = Math.exp(-Math.pow((i - 10) / 6, 2));
          const barHarmonic = Math.sin(time * (7.5 + (i % 4) * 1.5) + i * 0.45) * 0.4 + 0.6;
          bars.push(Math.max(5, Math.round(vocalEnergy * formantFactor * barHarmonic * 46)));
        }
        setSpectrumBars(bars);
      } else if (state === 'listening' && analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        const bars: number[] = [];
        const step = Math.max(1, Math.floor(dataArray.length / 24));
        for (let i = 0; i < 24; i++) {
          const val = dataArray[i * step] || 0;
          bars.push(Math.max(4, Math.round((val / 255) * 48)));
          sum += val;
        }
        const avg = sum / dataArray.length;
        const normalizedVol = Math.min(1, Math.max(0, (avg - 15) / 90));
        setVolumeLevel(normalizedVol);
        setSpectrumBars(bars);
      } else if (state === 'thinking') {
        const time = performance.now() / 1000;
        const thinkPulse = (Math.sin(time * 3) + 1) * 0.5;
        setVolumeLevel(0.08 + thinkPulse * 0.06);
        setSpectrumBars(new Array(24).fill(5));
      } else {
        // idle
        setVolumeLevel(0.02);
        setSpectrumBars(new Array(24).fill(4));
      }

      animFrameRef.current = requestAnimationFrame(updateAcoustics);
    };

    animFrameRef.current = requestAnimationFrame(updateAcoustics);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, []);

  // Initialize Microphone & Web Audio Analyser
  const initMicrophoneAudio = async () => {
    if (audioContextRef.current && micStreamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
    } catch (err: any) {
      console.warn('[VoiceMirror] Microphone init error:', err);
      showToast('Microphone access denied or unavailable.', 'error');
    }
  };

  // Start Speech Recognition
  const startListening = useCallback(async () => {
    if (isMutedRef.current) return;
    await initMicrophoneAudio();

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast('SpeechRecognition is not supported in this browser.', 'error');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      if (!isComponentMounted.current) return;
      setVoiceState('listening');
    };

    recognition.onresult = (event: any) => {
      if (!isComponentMounted.current) return;
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const activeText = (final || interim).trim();
      if (activeText) {
        setCurrentUserSpeech(activeText);

        // Barge-in: If AI is speaking, interrupt it
        if (voiceStateRef.current === 'speaking') {
          handleBargeIn();
        }

        // Voice Activity Detection (VAD): Reset 1.3s silence countdown
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        if (autoListenEnabledRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            if (activeText.length > 2) {
              handleDispatchUserSpeech(activeText);
            }
          }, 1300);
        }
      }
    };

    recognition.onerror = (event: any) => {
      // 'aborted' and 'no-speech' are benign normal lifecycle events in Web Speech API
      if (event.error === 'aborted' || event.error === 'no-speech') {
        return;
      }
      console.warn('[VoiceMirror] Recognition error:', event.error);
      if (isComponentMounted.current) {
        setVoiceState('idle');
      }
    };

    recognition.onend = () => {
      if (!isComponentMounted.current) return;
      // Auto-restart recognition if in listening state and not speaking
      if (voiceStateRef.current === 'listening' && !isMutedRef.current) {
        try {
          recognition.start();
        } catch {}
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.warn('[VoiceMirror] start exception:', e);
    }
  }, []);

  // Barge-In Interruption Handler
  const handleBargeIn = () => {
    cancelAllSpeech();
    if (speakerRef.current) {
      speakerRef.current.cancel();
      speakerRef.current = null;
    }
    setVoiceState('listening');
    vaultAudio.playSuccessChime();
  };

  // Pause / Resume Voice Sanctuary Session
  const handleTogglePause = () => {
    if (voiceState === 'paused') {
      // Resume
      setVoiceState('listening');
      showToast('Voice sanctuary resumed.', 'info');
      vaultAudio.playTapSound();
      if (!isMuted) {
        startListening();
      }
    } else {
      // Pause
      cancelAllSpeech();
      if (speakerRef.current) {
        speakerRef.current.cancel();
        speakerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setVoiceState('paused');
      showToast('Voice sanctuary paused.', 'info');
      vaultAudio.playTapSound();
    }
  };

  // Trigger Discard with Safety Confirmation if turns exist
  const handleTriggerDiscard = () => {
    if (dialogue.length > 0 || currentUserSpeech.trim().length > 0) {
      setIsDiscardConfirmOpen(true);
    } else {
      executeDiscard();
    }
  };

  // Execute Complete Session Discard
  const executeDiscard = () => {
    cleanupAudio();
    setDialogue([]);
    setCurrentUserSpeech('');
    setCurrentAiSpeech('');
    setSessionSeconds(0);
    setCognitiveBreakdown(null);
    setIsDiscardConfirmOpen(false);
    setVoiceState('listening');
    showToast('Voice session discarded.', 'info');
    vaultAudio.playTapSound();
    setTimeout(() => {
      if (isComponentMounted.current && !isMuted) {
        startListening();
      }
    }, 200);
  };

  // Dispatch User Speech to Gemini & Play AI Response
  const handleDispatchUserSpeech = async (spokenText: string) => {
    if (!spokenText.trim()) return;

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    // Stop recognition cleanly during inference
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    const userTurn: DialogueTurn = {
      id: `turn_${Date.now()}_u`,
      sender: 'user',
      text: spokenText.trim(),
      timestamp: new Date().toISOString(),
    };

    setDialogue((prev) => [...prev, userTurn]);
    setCurrentUserSpeech('');
    setVoiceState('thinking');

    try {
      const voiceSystemPrompt = `You are Nexura AI — the empathetic, warm, and deeply thoughtful psychological voice confidant in Nexus Mind Vault.
You are in a live, real-time bi-directional voice call with the user.
Directives:
1. Speak naturally like a compassionate psychologist or wise friend.
2. Keep responses concise (1 to 3 sentences maximum) so the dialogue flows effortlessly like a human conversation.
3. Validate their emotion, offer reflective insight, and occasionally ask a gentle Socratic grounding question.
4. Do NOT use markdown, emojis, asterisks, bullet points, or lists. Spoken sentences only.`;

      const contextSummary =
        entries.length > 0
          ? entries
              .slice(0, 5)
              .map((e) => `[Past Entry: ${e.title} (${e.mood})]: ${(e.content || '').slice(0, 140)}`)
              .join('\n')
          : 'First-time conversation.';

      let fullAiResponse = '';

      const speaker = new StreamingSentenceSpeaker({
        onSentenceStart: (sentence) => {
          if (!isComponentMounted.current) return;
          setVoiceState('speaking');
          setCurrentAiSpeech(sentence);
        },
        onComplete: () => {
          if (!isComponentMounted.current) return;
          setCurrentAiSpeech('');
          if (voiceStateRef.current === 'paused') return;
          if (autoListenEnabled && !isMuted) {
            setVoiceState('listening');
            startListening();
          } else {
            setVoiceState('idle');
          }
        },
      });

      speakerRef.current = speaker;

      const stream = streamGeminiChat({
        prompt: spokenText.trim(),
        history: dialogue.slice(-8).map((d) => ({
          role: d.sender === 'user' ? 'user' : 'model',
          content: d.text,
        })),
        systemInstruction: voiceSystemPrompt,
        context: contextSummary,
      });

      for await (const chunk of stream) {
        if (!isComponentMounted.current) break;
        fullAiResponse += chunk;
        speaker.pushChunk(chunk);
      }

      speaker.finishStream();

      // Record Assistant Turn
      const aiTurn: DialogueTurn = {
        id: `turn_${Date.now()}_a`,
        sender: 'assistant',
        text: cleanTextForSpeech(fullAiResponse),
        timestamp: new Date().toISOString(),
      };
      setDialogue((prev) => [...prev, aiTurn]);
    } catch (err: any) {
      console.warn('[VoiceMirror] Gemini Stream error:', err);
      showToast(err.message || 'AI speech reflection failed.', 'error');
      setVoiceState('idle');
    }
  };

  // Start initial listening on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      startListening();
    }, 450);
    return () => clearTimeout(timer);
  }, [startListening]);

  // End Session & Generate Cognitive Breakdown
  const handleEndSessionAndSynthesize = async () => {
    cleanupAudio();
    setIsSynthesizing(true);
    setViewMode('breakdown');

    const transcriptText = dialogue
      .map((d) => `${d.sender === 'user' ? 'User' : 'Cognitive Mirror'}: ${d.text}`)
      .join('\n');

    if (dialogue.length === 0) {
      // Fallback if no dialogue recorded
      setCognitiveBreakdown({
        title: 'Spontaneous Voice Reflection',
        summary: 'Brief vocal check-in conducted in sovereign voice sanctuary.',
        mood: 'calm',
        emotionalTrajectory: 'Calm & Present',
        cognitivePatterns: ['Mindful Awareness'],
        groundingTakeaways: ['Continue taking mindful moments throughout the day.'],
        suggestedTags: ['voice-session', 'mindfulness'],
        rawTranscript: 'Quiet session.',
        durationSeconds: sessionSeconds,
      });
      setIsSynthesizing(false);
      return;
    }

    try {
      // Quick Gemini inference for structured breakdown
      const prompt = `Analyze this voice conversation and return a JSON object with:
{
  "title": "Short poetic 4-6 word title capturing the theme",
  "summary": "Concise 2-3 sentence executive reflection synthesis",
  "mood": "calm" | "focused" | "creative" | "energetic" | "anxious" | "tired",
  "emotionalTrajectory": "Short 3-5 word arc (e.g. Overwhelmed -> Grounded Acceptance)",
  "cognitivePatterns": ["Array of 1 to 3 detected thinking patterns or distortions, e.g. Catastrophizing, Growth Mindset, Imposter Thoughts"],
  "groundingTakeaways": ["Array of 2 to 3 actionable grounding habits"],
  "suggestedTags": ["Array of 2 to 4 clean lowercase keywords"]
}

Dialogue:
${transcriptText}`;

      let parsedResult: any = null;
      try {
        const stream = streamGeminiChat({
          prompt,
          systemInstruction: 'You are a psychological cognitive scientist. Output valid JSON only without markdown fences.',
        });

        let rawResponse = '';
        for await (const chunk of stream) {
          rawResponse += chunk;
        }

        const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedResult = JSON.parse(cleanJson);
      } catch {
        // Deterministic Fallback if JSON parsing fails
        parsedResult = {
          title: 'Voice Sanctuary Reflection',
          summary: dialogue.filter((d) => d.sender === 'assistant').slice(-1)[0]?.text || 'Mindful voice reflection completed.',
          mood: 'focused',
          emotionalTrajectory: 'Vocal Expression ➔ Cognitive Alignment',
          cognitivePatterns: ['Reflective Processing', 'Self-Awareness'],
          groundingTakeaways: ['Protect intentional quiet time', 'Honor emotional observations'],
          suggestedTags: ['voice-session', 'neural-mirror'],
        };
      }

      setCognitiveBreakdown({
        title: parsedResult.title || 'Voice Reflection & Cognitive Synthesis',
        summary: parsedResult.summary || 'Insightful vocal reflection session.',
        mood: parsedResult.mood || 'focused',
        emotionalTrajectory: parsedResult.emotionalTrajectory || 'Clarity through Dialogue',
        cognitivePatterns: parsedResult.cognitivePatterns || ['Mindful Clarity'],
        groundingTakeaways: parsedResult.groundingTakeaways || ['Take deep grounding breaths.'],
        suggestedTags: parsedResult.suggestedTags || ['voice-session', 'clarity'],
        rawTranscript: transcriptText,
        durationSeconds: sessionSeconds,
      });
    } catch (err: any) {
      console.warn('[VoiceMirror] Synthesis error:', err);
      showToast('Failed to synthesize breakdown. Manual save available.', 'warning');
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Orb Styling & Pulsing Dynamics based on Web Audio Level & AI Vocal Cadence
  const orbScale =
    voiceState === 'listening'
      ? 1 + volumeLevel * 0.45
      : voiceState === 'speaking'
      ? 1.04 + volumeLevel * 0.38
      : voiceState === 'thinking'
      ? 1.03 + Math.sin(Date.now() / 300) * 0.02
      : voiceState === 'paused'
      ? 0.98
      : 1;

  const orbColor =
    voiceState === 'listening'
      ? 'radial-gradient(circle at 35% 35%, #34d399, #059669, #064e3b)'
      : voiceState === 'speaking'
      ? 'radial-gradient(circle at 35% 35%, #c084fc, #9333ea, #581c87)'
      : voiceState === 'thinking'
      ? 'radial-gradient(circle at 35% 35%, #fde047, #d97706, #78350f)'
      : voiceState === 'paused'
      ? 'radial-gradient(circle at 35% 35%, #fbbf24, #d97706, #451a03)'
      : 'radial-gradient(circle at 35% 35%, #60a5fa, #2563eb, #1e3a8a)';

  const orbGlow =
    voiceState === 'listening'
      ? `0 0 ${30 + volumeLevel * 60}px rgba(16, 185, 129, 0.65)`
      : voiceState === 'speaking'
      ? `0 0 ${35 + volumeLevel * 55}px rgba(168, 85, 247, 0.75)`
      : voiceState === 'thinking'
      ? `0 0 45px rgba(245, 158, 11, 0.65)`
      : voiceState === 'paused'
      ? `0 0 24px rgba(245, 158, 11, 0.4)`
      : `0 0 28px rgba(59, 130, 246, 0.45)`;

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 120px)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px 40px 16px',
        overflowX: 'hidden',
        overflowY: 'auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Background Ambient Aura (Confined to isolated layer to prevent horizontal overflow) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background:
              voiceState === 'speaking'
                ? 'radial-gradient(circle, rgba(168, 85, 247, 0.14) 0%, rgba(0,0,0,0) 70%)'
                : voiceState === 'listening'
                ? 'radial-gradient(circle, rgba(16, 185, 129, 0.14) 0%, rgba(0,0,0,0) 70%)'
                : voiceState === 'paused'
                ? 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, rgba(0,0,0,0) 70%)'
                : 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(0,0,0,0) 70%)',
            pointerEvents: 'none',
            transition: 'all 0.6s ease',
          }}
        />
      </div>

      {/* Top Header HUD Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#8b5cf6',
              boxShadow: '0 2px 10px rgba(139, 92, 246, 0.2)',
            }}
          >
            <Radio className="w-3.5 h-3.5 animate-pulse text-purple-400" />
            <span>Nexura AI • Sovereign Voice Sanctuary</span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {Math.floor(sessionSeconds / 60)}:{(sessionSeconds % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Quick Voice Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setAutoListenEnabled(!autoListenEnabled)}
            style={{
              fontSize: '11.5px',
              padding: '6px 12px',
              borderRadius: '10px',
              background: autoListenEnabled ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface)',
              color: autoListenEnabled ? '#10b981' : 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
            }}
            title="Toggle Hands-Free Auto-Turn VAD"
          >
            Auto-Turn: {autoListenEnabled ? 'On' : 'Off'}
          </button>

          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              if (!isMuted) {
                cleanupAudio();
                setIsMuted(true);
                setVoiceState('idle');
              } else {
                setIsMuted(false);
                startListening();
              }
            }}
            style={{
              fontSize: '11.5px',
              padding: '6px 12px',
              borderRadius: '10px',
              color: isMuted ? 'var(--accent-rose)' : 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5 inline mr-1" /> : <Mic className="w-3.5 h-3.5 inline mr-1" />}
            {isMuted ? 'Muted' : 'Mic Active'}
          </button>

          {/* Pause / Resume Button */}
          {viewMode === 'chamber' && (
            <button
              type="button"
              className="btn-ghost"
              onClick={handleTogglePause}
              style={{
                fontSize: '11.5px',
                padding: '6px 12px',
                borderRadius: '10px',
                background: voiceState === 'paused' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface)',
                color: voiceState === 'paused' ? '#f59e0b' : 'var(--text-secondary)',
                border: voiceState === 'paused' ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid var(--border-subtle)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title={voiceState === 'paused' ? 'Resume voice sanctuary session' : 'Pause session and timer'}
            >
              {voiceState === 'paused' ? (
                <>
                  <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              )}
            </button>
          )}

          {/* Discard Session Button */}
          {viewMode === 'chamber' && (
            <button
              type="button"
              className="btn-ghost"
              onClick={handleTriggerDiscard}
              style={{
                fontSize: '11.5px',
                padding: '6px 12px',
                borderRadius: '10px',
                color: 'var(--accent-rose, #f43f5e)',
                border: '1px solid var(--border-subtle)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Discard current session and reset dialogue"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>
          )}

          {viewMode === 'chamber' && (
            <button
              type="button"
              onClick={handleEndSessionAndSynthesize}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#ffffff',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>End & Synthesize</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Chamber Center Stage */}
      {viewMode === 'chamber' ? (
        <div
          style={{
            flex: '1 0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 10,
            margin: '20px 0',
            minHeight: '340px',
          }}
        >
          {/* Status Label */}
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '24px',
              color:
                voiceState === 'listening'
                  ? '#34d399'
                  : voiceState === 'speaking'
                  ? '#c084fc'
                  : voiceState === 'thinking'
                  ? '#fbbf24'
                  : voiceState === 'paused'
                  ? '#f59e0b'
                  : 'var(--text-muted)',
              transition: 'color 0.3s ease',
            }}
          >
            {voiceState === 'listening'
              ? 'Listening to you...'
              : voiceState === 'speaking'
              ? 'Reflecting with you...'
              : voiceState === 'thinking'
              ? 'Synthesizing thought...'
              : voiceState === 'paused'
              ? 'Session Paused'
              : 'Sanctuary Ready'}
          </div>

          {/* 3D Glowing Neural Resonance Orb */}
          <div
            onClick={
              voiceState === 'speaking'
                ? handleBargeIn
                : voiceState === 'paused'
                ? handleTogglePause
                : startListening
            }
            style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: orbColor,
              boxShadow: orbGlow,
              transform: `scale(${orbScale})`,
              transition: 'transform 0.12s ease-out, box-shadow 0.3s ease',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              userSelect: 'none',
            }}
            title={
              voiceState === 'speaking'
                ? 'Tap to interrupt'
                : voiceState === 'paused'
                ? 'Tap to resume'
                : 'Tap to speak'
            }
          >
            {/* Inner Core Shimmer */}
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.45)',
                filter: 'blur(8px)',
              }}
            />

            {/* Concentric Resonance Ripple Waves */}
            {(voiceState === 'listening' || voiceState === 'speaking') && volumeLevel > 0.15 && (
              <>
                <div
                  style={{
                    position: 'absolute',
                    inset: '-16px',
                    borderRadius: '50%',
                    border: `2px solid ${voiceState === 'speaking' ? 'rgba(192, 132, 252, 0.45)' : 'rgba(52, 211, 153, 0.45)'}`,
                    transform: `scale(${1 + volumeLevel * 0.28})`,
                    transition: 'transform 0.08s ease-out',
                    pointerEvents: 'none',
                  }}
                />
                {volumeLevel > 0.35 && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: '-32px',
                      borderRadius: '50%',
                      border: `1.5px solid ${voiceState === 'speaking' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                      transform: `scale(${1 + volumeLevel * 0.38})`,
                      transition: 'transform 0.08s ease-out',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </>
            )}
          </div>

          {/* 32-Band FFT Frequency Spectrum Visualizer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '4px',
              height: '52px',
              marginTop: '32px',
            }}
          >
            {spectrumBars.map((height, idx) => (
              <span
                key={idx}
                style={{
                  width: '5px',
                  height: `${height}px`,
                  borderRadius: '3px',
                  background:
                    voiceState === 'speaking'
                      ? 'linear-gradient(to top, #9333ea, #c084fc)'
                      : voiceState === 'listening'
                      ? 'linear-gradient(to top, #059669, #34d399)'
                      : voiceState === 'paused'
                      ? '#d97706'
                      : 'var(--border-subtle)',
                  opacity: voiceState === 'idle' ? 0.3 : 0.9,
                  transition: 'height 80ms ease, opacity 0.2s ease',
                }}
              />
            ))}
          </div>

          {/* Subtitles Overlay */}
          <div
            style={{
              maxWidth: '620px',
              minHeight: '64px',
              textAlign: 'center',
              marginTop: '20px',
              padding: '0 16px',
            }}
          >
            {currentUserSpeech ? (
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.4' }}>
                "{currentUserSpeech}"
              </div>
            ) : currentAiSpeech ? (
              <div style={{ fontSize: '15px', color: '#8b5cf6', fontWeight: 500, lineHeight: '1.5' }}>
                {currentAiSpeech}
              </div>
            ) : voiceState === 'paused' ? (
              <div style={{ fontSize: '14px', color: '#f59e0b', fontWeight: 500 }}>
                Voice sanctuary paused. Tap Resume to continue.
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Speak naturally. Nexura AI is listening.
              </div>
            )}
          </div>
        </div>
      ) : isSynthesizing ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '3px solid rgba(139, 92, 246, 0.25)',
              borderTopColor: '#8b5cf6',
              animation: 'spin 1s linear infinite',
              marginBottom: '16px',
            }}
          />
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Synthesizing Cognitive Breakdown...
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Extracting emotional trajectory, thinking distortions, and grounding habits
          </div>
        </div>
      ) : cognitiveBreakdown ? (
        <div style={{ flex: '1 0 auto', zIndex: 10, padding: '12px 0', width: '100%' }}>
          <CognitiveBreakdownCard
            breakdown={cognitiveBreakdown}
            onSaveToVault={(entry) => {
              onAddEntry(entry);
              showToast('🎙️ Voice reflection encrypted & sealed into Sovereign Vault!', 'success');
              // Reset back to ready chamber
              setDialogue([]);
              setCognitiveBreakdown(null);
              setViewMode('chamber');
              startListening();
            }}
            onDiscard={() => {
              setDialogue([]);
              setCognitiveBreakdown(null);
              setViewMode('chamber');
              startListening();
            }}
            onRestartVoice={() => {
              setViewMode('chamber');
              startListening();
            }}
            onViewGraph={() => {
              if (onSelectTab) onSelectTab('graph');
            }}
            showToast={showToast}
          />
        </div>
      ) : null}

      {/* Collapsible Dialogue History Drawer */}
      {viewMode === 'chamber' && dialogue.length > 0 && (
        <div
          style={{
            position: 'relative',
            zIndex: 15,
            marginTop: '20px',
            marginBottom: '16px',
            background: 'var(--bg-surface)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            flexShrink: 0,
          }}
        >
          <div
            onClick={() => setShowDrawer(!showDrawer)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              cursor: 'pointer',
              userSelect: 'none',
              borderBottom: showDrawer ? '1px solid var(--border-subtle)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600 }}>
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              <span>Live Dialogue Turns ({dialogue.length})</span>
            </div>
            {showDrawer ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronUp className="w-4 h-4 text-muted" />}
          </div>

          {showDrawer && (
            <div
              style={{
                maxHeight: '260px',
                overflowY: 'auto',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {dialogue.map((turn) => (
                <div
                  key={turn.id}
                  style={{
                    alignSelf: turn.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    background: turn.sender === 'user' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-sidebar)',
                    color: turn.sender === 'user' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <strong style={{ fontSize: '10.5px', color: turn.sender === 'user' ? '#8b5cf6' : '#10b981', display: 'block', marginBottom: '2px' }}>
                    {turn.sender === 'user' ? 'You' : 'Nexura AI'}
                  </strong>
                  {turn.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Discard Confirmation Modal */}
      {isDiscardConfirmOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
          onClick={() => setIsDiscardConfirmOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '18px',
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'rgba(244, 63, 94, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f43f5e',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Discard Voice Session?
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  This will erase {dialogue.length} dialogue turns and reset the session.
                </p>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Are you sure you want to discard? This vocal reflection has not been synthesized or sealed into your vault yet.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setIsDiscardConfirmOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Keep Session
              </button>
              <button
                type="button"
                onClick={executeDiscard}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#f43f5e',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(244, 63, 94, 0.3)',
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Discard Session</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
