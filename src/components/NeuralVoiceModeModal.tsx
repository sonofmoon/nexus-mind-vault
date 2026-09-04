import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Save,
  MessageSquare,
  Radio,
  RefreshCw,
  CornerDownRight,
  Shield,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { JournalEntry } from '../types';
import { streamGeminiChat } from '../services/geminiClient';
import {
  StreamingSentenceSpeaker,
  cancelAllSpeech,
  cleanTextForSpeech,
} from '../services/voiceSynthesisService';
import { vaultAudio } from '../utils/vaultAudioSynthesizer';

interface NeuralVoiceModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextEntries?: JournalEntry[];
  onSaveSessionToVault?: (title: string, transcript: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

interface DialogueTurn {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const NeuralVoiceModeModal: React.FC<NeuralVoiceModeModalProps> = ({
  isOpen,
  onClose,
  contextEntries = [],
  onSaveSessionToVault,
  showToast,
}) => {
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [autoListenEnabled, setAutoListenEnabled] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);

  // Transcript dialogue
  const [dialogue, setDialogue] = useState<DialogueTurn[]>([]);
  const [currentUserSpeech, setCurrentUserSpeech] = useState('');
  const [currentAiSpeech, setCurrentAiSpeech] = useState('');

  // Audio & Speech References
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const meterAnimationRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const speakerRef = useRef<StreamingSentenceSpeaker | null>(null);
  const isComponentMounted = useRef(true);

  // Keep state sync ref for listeners
  const voiceStateRef = useRef(voiceState);
  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Initialize Web Audio volume meter for real-time orb pulse
  const setupAudioMeter = async (stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const pollVolume = () => {
        if (!analyserRef.current || !isComponentMounted.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 80);
        setVolumeLevel(normalized);

        meterAnimationRef.current = requestAnimationFrame(pollVolume);
      };

      meterAnimationRef.current = requestAnimationFrame(pollVolume);
    } catch (err) {
      console.warn('[VoiceModal] Audio meter initialization error:', err);
    }
  };

  const cleanupAudio = () => {
    if (meterAnimationRef.current) {
      cancelAnimationFrame(meterAnimationRef.current);
      meterAnimationRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (speakerRef.current) {
      speakerRef.current.cancel();
      speakerRef.current = null;
    }
    cancelAllSpeech();
  };

  // Dispatch user voice input to Gemini streaming LLM
  const dispatchUserSpeechToAI = useCallback(
    async (rawUserInput: string) => {
      const cleanedInput = rawUserInput.trim();
      if (!cleanedInput) {
        setVoiceState('listening');
        return;
      }

      // Stop recognition while AI thinks & speaks
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }

      setVoiceState('thinking');
      setCurrentUserSpeech('');
      setCurrentAiSpeech('');

      // Add to conversation history
      const userTurn: DialogueTurn = {
        id: 'usr_' + Date.now(),
        sender: 'user',
        text: cleanedInput,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setDialogue((prev) => [...prev, userTurn]);

      // Initialize sentence-chunked streaming speaker
      const speaker = new StreamingSentenceSpeaker({
        onSentenceStart: (sentence) => {
          setVoiceState('speaking');
          setCurrentAiSpeech((prev) => (prev ? `${prev} ${sentence}` : sentence));
        },
        onComplete: () => {
          if (!isComponentMounted.current) return;
          setCurrentAiSpeech('');
          if (autoListenEnabled && !isMutedRef.current) {
            // Hands-free auto-turn loop: Re-arm microphone
            startListeningLoop();
          } else {
            setVoiceState('idle');
          }
        },
      });
      speakerRef.current = speaker;

      // Construct system instruction tailored for spoken dialogue
      const voiceSystemPrompt = `You are the Nexus Mind Vault voice reflection partner, speaking aloud with the user in real-time.
Respond warmly, empathetically, and conversationally.
CRITICAL SPOKEN INSTRUCTIONS:
1. Keep answers concise: 1 to 3 natural conversational sentences maximum.
2. NEVER use markdown, headers, bullet points, asterisks, or code blocks.
3. Speak as if talking to a friend on a phone call.
4. Ground your thoughts in the user's encrypted vault reflections when relevant.`;

      // Context from recent reflections
      const contextSummary =
        contextEntries.length > 0
          ? contextEntries
              .slice(0, 5)
              .map((e) => `[Reflection: ${e.title} (${e.mood})]: ${(e.content || '').slice(0, 150)}`)
              .join('\n')
          : 'No previous reflections.';

      let fullAiResponse = '';

      try {
        const stream = streamGeminiChat({
          prompt: cleanedInput,
          history: dialogue.slice(-6).map((d) => ({
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

        // Add assistant turn to dialogue record
        setDialogue((prev) => [
          ...prev,
          {
            id: 'ai_' + Date.now(),
            sender: 'assistant',
            text: cleanTextForSpeech(fullAiResponse),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } catch (err: any) {
        console.error('[VoiceModal] Gemini stream error:', err);
        showToast('Voice thought synthesis interrupted. Reconnecting...', 'warning');
        speaker.cancel();
        setVoiceState('listening');
      }
    },
    [contextEntries, dialogue, autoListenEnabled, showToast]
  );

  // Start continuous speech recognition loop
  const startListeningLoop = useCallback(async () => {
    if (isMutedRef.current || !isOpen) return;

    // Interrupt any active speaker
    if (speakerRef.current) {
      speakerRef.current.cancel();
      speakerRef.current = null;
    }
    cancelAllSpeech();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('Speech recognition not supported in this browser.', 'error');
      return;
    }

    try {
      if (!mediaStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        await setupAudioMeter(stream);
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let speechAccumulated = '';

      recognition.onstart = () => {
        setVoiceState('listening');
      };

      recognition.onresult = (event: any) => {
        // Barge-in: if AI was speaking and user speaks, cancel AI speech immediately
        if (voiceStateRef.current === 'speaking' || speakerRef.current) {
          speakerRef.current?.cancel();
          cancelAllSpeech();
          setVoiceState('listening');
        }

        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            speechAccumulated += ' ' + text;
          } else {
            interim += text;
          }
        }

        const currentText = (speechAccumulated + ' ' + interim).trim();
        setCurrentUserSpeech(currentText);

        // Voice Activity Detection (VAD): Reset silence timeout on speech
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        if (currentText.length > 2) {
          // If silence for 1.3 seconds, automatically trigger AI dispatch
          silenceTimerRef.current = setTimeout(() => {
            if (currentText.trim().length > 2 && voiceStateRef.current === 'listening') {
              dispatchUserSpeechToAI(currentText);
            }
          }, 1300);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('[VoiceModal] Recognition event:', event.error);
        }
      };

      recognition.onend = () => {
        // Auto-reconnect if still in listening state
        if (voiceStateRef.current === 'listening' && !isMutedRef.current && isOpen) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.start();
    } catch (err: any) {
      console.error('[VoiceModal] Microphone access error:', err);
      showToast('Microphone permission required for Live Voice Mode.', 'error');
      setVoiceState('idle');
    }
  }, [isOpen, dispatchUserSpeechToAI, showToast]);

  // Handle Barge-in interrupt (User clicks orb or starts speaking)
  const handleInterrupt = () => {
    try {
      vaultAudio.playKeyClick();
    } catch {}

    if (speakerRef.current) {
      speakerRef.current.cancel();
      speakerRef.current = null;
    }
    cancelAllSpeech();
    setCurrentAiSpeech('');
    startListeningLoop();
    showToast('Interrupted. Listening...', 'info');
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (nextMuted) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      setVoiceState('idle');
      showToast('Microphone muted.', 'info');
    } else {
      showToast('Microphone unmuted.', 'info');
      startListeningLoop();
    }
  };

  // Save session transcript directly to encrypted vault
  const handleSaveToVault = () => {
    if (dialogue.length === 0) {
      showToast('No voice dialogue to save.', 'warning');
      return;
    }

    const firstUserQuery = dialogue.find((d) => d.sender === 'user')?.text || 'Voice Reflection';
    const title = `🎙️ Voice Call: ${firstUserQuery.slice(0, 28)}${firstUserQuery.length > 28 ? '...' : ''}`;
    const transcriptMarkdown = dialogue
      .map((d) => {
        const speaker = d.sender === 'user' ? '👤 **You**' : '✨ **Nexus Mind Voice AI**';
        return `${speaker} *(${d.timestamp})*:\n${d.text}`;
      })
      .join('\n\n---\n\n');

    if (onSaveSessionToVault) {
      onSaveSessionToVault(title, transcriptMarkdown);
    } else {
      showToast('Voice session transcript preserved.', 'success');
    }
    onClose();
  };

  // Life-cycle mount
  useEffect(() => {
    isComponentMounted.current = true;
    if (isOpen) {
      try {
        vaultAudio.playUnlockSuccess();
      } catch {}
      startListeningLoop();
    }

    return () => {
      isComponentMounted.current = false;
      cleanupAudio();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate dynamic orb scaling based on volume and state
  const orbScale =
    voiceState === 'listening'
      ? 1 + volumeLevel * 0.35
      : voiceState === 'speaking'
      ? 1.08 + Math.sin(Date.now() / 200) * 0.05
      : 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(circle at center, #10141e 0%, #080a0f 100%)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 20px',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* 1. Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '800px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6750a4, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Nexus Mind Live Voice Call
            </h3>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              Bi-directional Real-Time Cognitive Partner
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Status Badge */}
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '4px 12px',
              borderRadius: '999px',
              background:
                voiceState === 'listening'
                  ? 'rgba(34, 197, 94, 0.2)'
                  : voiceState === 'thinking'
                  ? 'rgba(234, 179, 8, 0.2)'
                  : voiceState === 'speaking'
                  ? 'rgba(168, 85, 247, 0.2)'
                  : 'rgba(255, 255, 255, 0.1)',
              color:
                voiceState === 'listening'
                  ? '#4ade80'
                  : voiceState === 'thinking'
                  ? '#facc15'
                  : voiceState === 'speaking'
                  ? '#c084fc'
                  : '#94a3b8',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'currentColor',
                animation: voiceState !== 'idle' ? 'pulse 1.5s infinite' : 'none',
              }}
            />
            {voiceState}
          </span>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="End Voice Call"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 2. Central Neural Resonance Orb Display */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          position: 'relative',
        }}
      >
        {/* Multi-layered Glowing Resonant Orb */}
        <div
          onClick={voiceState === 'speaking' ? handleInterrupt : undefined}
          style={{
            position: 'relative',
            width: '220px',
            height: '220px',
            cursor: voiceState === 'speaking' ? 'pointer' : 'default',
          }}
          title={voiceState === 'speaking' ? 'Click to interrupt' : undefined}
        >
          {/* Outer Ripple Wave */}
          <div
            style={{
              position: 'absolute',
              inset: '-20px',
              borderRadius: '50%',
              background:
                voiceState === 'listening'
                  ? 'radial-gradient(circle, rgba(34, 197, 94, 0.25) 0%, transparent 70%)'
                  : voiceState === 'speaking'
                  ? 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
              transform: `scale(${orbScale * 1.15})`,
              transition: 'transform 0.15s ease-out',
              opacity: volumeLevel > 0.05 || voiceState === 'speaking' ? 0.9 : 0.2,
            }}
          />

          {/* Secondary Acoustic Wave */}
          <div
            style={{
              position: 'absolute',
              inset: '-10px',
              borderRadius: '50%',
              background:
                voiceState === 'listening'
                  ? 'radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 65%)'
                  : voiceState === 'speaking'
                  ? 'radial-gradient(circle, rgba(192, 132, 252, 0.45) 0%, transparent 65%)'
                  : 'radial-gradient(circle, rgba(96, 165, 250, 0.25) 0%, transparent 65%)',
              transform: `scale(${orbScale * 1.08})`,
              transition: 'transform 0.12s ease-out',
            }}
          />

          {/* Core Fluid Sphere */}
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background:
                voiceState === 'listening'
                  ? 'radial-gradient(circle at 35% 35%, #86efac 0%, #16a34a 50%, #064e3b 100%)'
                  : voiceState === 'thinking'
                  ? 'radial-gradient(circle at 35% 35%, #fde047 0%, #ca8a04 50%, #713f12 100%)'
                  : voiceState === 'speaking'
                  ? 'radial-gradient(circle at 35% 35%, #e879f9 0%, #9333ea 50%, #4c1d95 100%)'
                  : 'radial-gradient(circle at 35% 35%, #93c5fd 0%, #2563eb 50%, #1e3a8a 100%)',
              boxShadow:
                voiceState === 'listening'
                  ? '0 0 50px rgba(34, 197, 94, 0.5), inset 0 0 30px rgba(255,255,255,0.4)'
                  : voiceState === 'speaking'
                  ? '0 0 60px rgba(168, 85, 247, 0.6), inset 0 0 30px rgba(255,255,255,0.4)'
                  : '0 0 40px rgba(59, 130, 246, 0.35), inset 0 0 20px rgba(255,255,255,0.3)',
              transform: `scale(${orbScale})`,
              transition: 'transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity
              size={48}
              style={{
                color: '#ffffff',
                opacity: 0.85,
                transform: voiceState === 'thinking' ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.6s ease',
              }}
            />
          </div>
        </div>

        {/* Status Callout / Instruction Under Orb */}
        <div style={{ marginTop: '28px', textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9' }}>
            {voiceState === 'listening'
              ? 'Listening to you...'
              : voiceState === 'thinking'
              ? 'Reflecting on your thoughts...'
              : voiceState === 'speaking'
              ? 'Speaking aloud (tap orb to interrupt)'
              : 'Microphone muted'}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
            {autoListenEnabled
              ? 'Hands-free continuous mode active. Pause speaking to receive answer.'
              : 'Manual push-to-talk mode active.'}
          </div>
        </div>

        {/* Live Subtitles & Captions */}
        {showSubtitles && (currentUserSpeech || currentAiSpeech) && (
          <div
            style={{
              marginTop: '20px',
              maxWidth: '560px',
              width: '90%',
              padding: '12px 18px',
              borderRadius: '16px',
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              fontSize: '13.5px',
              lineHeight: 1.5,
              color: '#f8fafc',
              textAlign: 'center',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            {currentUserSpeech && (
              <span style={{ color: '#86efac' }}>
                👤 {currentUserSpeech}
              </span>
            )}
            {currentAiSpeech && (
              <span style={{ color: '#e879f9' }}>
                ✨ {currentAiSpeech}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. Bottom Control Bar */}
      <div
        style={{
          maxWidth: '700px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap',
          }}
        >
          {/* Mute Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            style={{
              padding: '12px 20px',
              borderRadius: '16px',
              background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: isMuted ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
              color: isMuted ? '#f87171' : '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
          </button>

          {/* Interrupt AI Button */}
          {voiceState === 'speaking' && (
            <button
              type="button"
              onClick={handleInterrupt}
              style={{
                padding: '12px 20px',
                borderRadius: '16px',
                background: 'rgba(168, 85, 247, 0.25)',
                border: '1px solid #a855f7',
                color: '#e9d5ff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <VolumeX size={18} />
              <span>Interrupt & Speak</span>
            </button>
          )}

          {/* Subtitles Toggle */}
          <button
            type="button"
            onClick={() => setShowSubtitles((prev) => !prev)}
            style={{
              padding: '12px 18px',
              borderRadius: '16px',
              background: showSubtitles ? 'rgba(59, 130, 246, 0.18)' : 'rgba(255, 255, 255, 0.08)',
              border: showSubtitles ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.15)',
              color: showSubtitles ? '#93c5fd' : '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <MessageSquare size={17} />
            <span>{showSubtitles ? 'Captions ON' : 'Captions OFF'}</span>
          </button>

          {/* Save to Vault Button */}
          <button
            type="button"
            onClick={handleSaveToVault}
            disabled={dialogue.length === 0}
            style={{
              padding: '12px 22px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: dialogue.length === 0 ? 'not-allowed' : 'pointer',
              opacity: dialogue.length === 0 ? 0.4 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            }}
          >
            <Save size={17} />
            <span>Save to Vault ({dialogue.length})</span>
          </button>
        </div>

        {/* Security Shield Label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          <Shield size={12} style={{ color: '#10b981' }} />
          <span>Sovereign Voice Channel • Local WebAudio & Authenticated Gemini Ladder</span>
        </div>
      </div>
    </div>
  );
};
