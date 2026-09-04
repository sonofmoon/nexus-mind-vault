import { useState, useRef, useCallback, useEffect } from 'react';
import { authenticatedFetch } from '../services/apiClient';

export type RecorderMode = 'idle' | 'recording' | 'paused' | 'stopped';

export interface UseVoiceRecorderOptions {
  onError?: (message: string) => void;
}

export function useVoiceRecorder(options?: UseVoiceRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mode, setMode] = useState<RecorderMode>('idle');
  const [activeEngine, setActiveEngine] = useState<'none' | 'speech' | 'media'>('none');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const modeRef = useRef<RecorderMode>('idle');

  // Keep modeRef in sync
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const cleanupAudioAnalyser = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const cleanupMediaStream = useCallback(() => {
    cleanupAudioAnalyser();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, [cleanupAudioAnalyser]);

  const setupAudioMeter = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const pcmData = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(pcmData);
        let sum = 0;
        for (let i = 0; i < pcmData.length; i++) {
          sum += pcmData[i];
        }
        const avg = sum / pcmData.length;
        const normalized = Math.min(1, avg / 128);
        setAudioLevel(normalized);

        if (modeRef.current === 'recording') {
          animFrameRef.current = requestAnimationFrame(updateMeter);
        }
      };

      updateMeter();
    } catch (e) {
      console.warn('[useVoiceRecorder] Audio meter setup notice:', e);
    }
  }, []);

  const sendAudioToGemini = useCallback(async (audioBlob: Blob) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const encoded = result?.split(',')[1];
          if (!encoded) {
            reject(new Error('Failed to encode audio payload.'));
            return;
          }
          resolve(encoded);
        };
        reader.onerror = () => reject(new Error('Failed to read audio payload.'));
      });

      const res = await authenticatedFetch('/api/gemini/audio', {
        method: 'POST',
        body: JSON.stringify({ audio: base64, mimeType: audioBlob.type || 'audio/webm' }),
      });

      if (!res.ok) {
        throw new Error(`Audio transcription request failed (${res.status}).`);
      }

      const data = await res.json();
      if (data?.transcript) {
        setTranscript((prev) => (prev ? `${prev}\n${data.transcript}` : data.transcript));
      }
    } catch (err: any) {
      const message = err?.message || 'Voice transcription failed.';
      console.warn('[VoiceRecorder] sendAudioToGemini notice:', message);
    }
  }, []);

  const startSpeechRecognition = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone recording is not supported in this browser environment.');
    }

    // 1. Always start MediaStream & MediaRecorder so we capture the real audio file
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    setupAudioMeter(stream);

    const preferredMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : '';

    const recorder = preferredMimeType
      ? new MediaRecorder(stream, { mimeType: preferredMimeType })
      : new MediaRecorder(stream);

    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      try {
        if (chunksRef.current.length === 0) {
          console.warn('[useVoiceRecorder] No audio chunks captured.');
          return;
        }
        const rawMime = recorder.mimeType || 'audio/webm';
        const cleanMime = rawMime.split(';')[0] || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: cleanMime });
        if (audioBlob.size === 0) {
          console.warn('[useVoiceRecorder] Audio blob is empty.');
          return;
        }
        const url = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(url);

        // If SpeechRecognition didn't transcribe anything, fall back to Gemini
        if (!transcript.trim()) {
          await sendAudioToGemini(audioBlob);
        }
      } catch (err) {
        console.warn('[useVoiceRecorder] onstop processing notice:', err);
      } finally {
        cleanupMediaStream();
      }
    };

    recorder.start(250);
    setIsRecording(true);
    setMode('recording');

    // 2. Concurrently initiate SpeechRecognition if browser supports it
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            }
          }
          if (final) {
            setTranscript((prev) => (prev ? `${prev} ${final.trim()}` : final.trim()));
          }
        };

        recognition.onerror = (e: any) => {
          if (e.error === 'aborted' || e.error === 'no-speech') {
            return;
          }
          console.warn('[useVoiceRecorder] SpeechRecognition error:', e.error || e);
          if (e.error === 'not-allowed') {
            options?.onError?.('Microphone permission not granted for speech recognition.');
          }
        };

        recognition.onend = () => {
          // If still recording, restart recognition seamlessly unless manually stopped
          if (modeRef.current === 'recording' && recognitionRef.current) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognition.start();
        setActiveEngine('speech');
      } catch (recErr) {
        console.warn('[useVoiceRecorder] SpeechRecognition initialization fallback:', recErr);
        setActiveEngine('media');
      }
    } else {
      setActiveEngine('media');
    }
  }, [cleanupMediaStream, options, sendAudioToGemini, setupAudioMeter, transcript]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setMode('paused');
    setIsRecording(false);
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {}
    }
    setMode('recording');
    setIsRecording(true);

    // Resume visualizer
    if (analyserRef.current) {
      const pcmData = new Uint8Array(analyserRef.current.frequencyBinCount);
      const updateMeter = () => {
        if (!analyserRef.current || modeRef.current !== 'recording') return;
        analyserRef.current.getByteFrequencyData(pcmData);
        let sum = 0;
        for (let i = 0; i < pcmData.length; i++) {
          sum += pcmData[i];
        }
        setAudioLevel(Math.min(1, (sum / pcmData.length) / 128));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.requestData();
      } catch {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('[useVoiceRecorder] mediaRecorder stop error:', err);
      }
    } else {
      cleanupMediaStream();
    }

    setIsRecording(false);
    setMode('stopped');
    setActiveEngine('none');
  }, [cleanupMediaStream]);

  const clearRecording = useCallback(() => {
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }
    chunksRef.current = [];
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscript('');
    setMode('idle');
    setIsRecording(false);
    setActiveEngine('none');
    cleanupMediaStream();
  }, [audioUrl, cleanupMediaStream]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupMediaStream();
    };
  }, [cleanupMediaStream]);

  return {
    isRecording,
    transcript,
    audioUrl,
    audioBlob,
    mode,
    activeEngine,
    audioLevel,
    startSpeechRecognition,
    pauseRecording,
    resumeRecording,
    stopRecording,
    clearRecording,
  };
}


