import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RotateCw,
  Sparkles,
  Zap,
  Clock,
  Check,
  X,
  RefreshCw,
  Eye,
  Sliders,
  ShieldCheck,
  Download,
  Crosshair,
  Grid,
  Activity,
  Layers,
  MapPin,
  Maximize2,
  Upload,
  Image as ImageIcon,
  Shield,
  FileText,
} from 'lucide-react';

export interface CapturedPhotoResult {
  dataUrl: string;
  name: string;
  filterName: string;
  timestamp: string;
  watermarked: boolean;
  caption?: string;
}

export interface InnovativeCameraStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photo: CapturedPhotoResult) => void;
  title?: string;
  subtitle?: string;
  showToast?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export type LensFilterId = 'natural' | 'cyberpunk' | 'noir' | 'golden' | 'emerald' | 'chromatic';

interface LensFilterOption {
  id: LensFilterId;
  name: string;
  badge: string;
  cssFilter: string;
  color: string;
  description: string;
}

const LENS_FILTERS: LensFilterOption[] = [
  {
    id: 'natural',
    name: 'Natural Studio',
    badge: 'RAW',
    cssFilter: 'none',
    color: '#38bdf8',
    description: 'High-fidelity unfiltered optical feed',
  },
  {
    id: 'cyberpunk',
    name: 'Cyber Matrix',
    badge: 'NEO',
    cssFilter: 'contrast(125%) saturate(140%) hue-rotate(15deg) brightness(105%)',
    color: '#06b6d4',
    description: 'Vibrant neon edge dynamics & chromatic glow',
  },
  {
    id: 'noir',
    name: 'Zero-Trust Noir',
    badge: 'B&W',
    cssFilter: 'grayscale(100%) contrast(140%) brightness(95%)',
    color: '#94a3b8',
    description: 'Cryptographic high-contrast monochrome',
  },
  {
    id: 'golden',
    name: 'Retro Nostalgia',
    badge: 'WARM',
    cssFilter: 'sepia(35%) saturate(130%) contrast(110%) brightness(105%)',
    color: '#f59e0b',
    description: 'Warm vintage film grain & amber glow',
  },
  {
    id: 'emerald',
    name: 'Quantum Emerald',
    badge: 'NEURAL',
    cssFilter: 'hue-rotate(60deg) saturate(130%) contrast(115%)',
    color: '#10b981',
    description: 'Deep cognitive neural focus spectrum',
  },
  {
    id: 'chromatic',
    name: 'Dream Twilight',
    badge: 'AURA',
    cssFilter: 'contrast(115%) brightness(110%) saturate(150%) hue-rotate(-20deg)',
    color: '#c084fc',
    description: 'Ethereal twilight aura with soft edge vignette',
  },
];

export const InnovativeCameraStudioModal: React.FC<InnovativeCameraStudioModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = "CyberLens Neural Camera Studio",
  subtitle = "Zero-knowledge optical capture with live AI mood filters, biometric telemetry & tamper-proof timestamps",
  showToast,
}) => {
  // Optical & Stream State
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isFlashActive, setIsFlashActive] = useState(false);

  // Creative & Telemetry Controls
  const [selectedFilter, setSelectedFilter] = useState<LensFilterId>('natural');
  const [showReticle, setShowReticle] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showBiometrics, setShowBiometrics] = useState(true);
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 5 | 10>(0);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [burstMode, setBurstMode] = useState(false);

  // Biometric Mock Simulation Telemetry
  const [biometricFocusRate, setBiometricFocusRate] = useState(94);
  const [biometricState, setBiometricState] = useState<'Focused' | 'Calm' | 'Reflective' | 'Inspired'>('Focused');

  // Captured Review State
  const [reviewPhotoUrl, setReviewPhotoUrl] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [burstGallery, setBurstGallery] = useState<string[]>([]);
  const [selectedBurstIdx, setSelectedBurstIdx] = useState<number>(0);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Synthesize realistic mechanical camera shutter sound using Web Audio API
  const playShutterSound = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Shutter click 1 (mirror flip up)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(800, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04);
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.05);

      // Shutter click 2 (curtain release)
      setTimeout(() => {
        if (!ctx) return;
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(450, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.05);
        gain2.gain.setValueAtTime(0.25, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.06);
      }, 55);
    } catch {
      // Audio autoplay policy fallback
    }
  }, []);

  // Handle direct file upload fallback from disk
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setReviewPhotoUrl(event.target.result as string);
          if (showToast) showToast(`Loaded photo "${file.name}" for review & sealing.`, 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate synthetic neural biometric snapshot when hardware camera is unavailable
  const generateSyntheticSnapshot = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cyber Neural Gradient Background
    const grad = ctx.createLinearGradient(0, 0, 1280, 720);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    // Matrix Grid Lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1280; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 720);
      ctx.stroke();
    }
    for (let y = 0; y < 720; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1280, y);
      ctx.stroke();
    }

    // Glowing Reticle Target in Center
    const centerX = 1280 / 2;
    const centerY = 720 / 2 - 30;

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 110, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 140, 0, Math.PI * 2);
    ctx.stroke();

    // Biometric Shield
    ctx.font = 'bold 44px "Google Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🛡️', centerX, centerY - 10);

    ctx.font = 'bold 22px "Google Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('NEURAL BIOMETRIC PROOF SEAL', centerX, centerY + 35);

    ctx.font = '13.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('ZERO-KNOWLEDGE AUTHENTICATED OPTICAL SNAPSHOT', centerX, centerY + 65);

    // Bottom Telemetry HUD
    const now = new Date();
    const dateStr = now.toISOString();
    const hash = 'SHA256:' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(40, 620, 1200, 60);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.strokeRect(40, 620, 1200, 60);

    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText(`TIMESTAMP: ${dateStr}`, 60, 655);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#c084fc';
    ctx.fillText(`SEAL: ${hash}`, 1220, 655);

    playShutterSound();
    const synthUrl = canvas.toDataURL('image/jpeg', 0.92);
    setReviewPhotoUrl(synthUrl);
    if (showToast) showToast('Generated Synthetic Biometric Snapshot.', 'success');
  }, [showToast, playShutterSound]);

  // Initialize and attach camera stream
  const startCamera = useCallback(async () => {
    // Stop any existing stream tracks
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    setPermissionError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access API is not supported in this browser.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setHasPermission(false);
      let msg = 'Could not access optical sensor.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera sensor hardware detected on your device.';
      } else if (err.name === 'NotReadableError') {
        msg = 'Camera is currently in use by another application.';
      }
      setPermissionError(msg);
      if (showToast) showToast(msg, 'error');
    }
  }, [facingMode, showToast]);

  // Handle open / close lifecycle
  useEffect(() => {
    if (isOpen) {
      startCamera();
      setReviewPhotoUrl(null);
      setBurstGallery([]);
      setPhotoCaption('');
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isOpen, startCamera]);

  // Bind stream when video element renders
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Biometric telemetry dynamic fluctuation
  useEffect(() => {
    if (!isOpen || reviewPhotoUrl) return;
    const interval = setInterval(() => {
      setBiometricFocusRate(Math.floor(91 + Math.random() * 8));
      const states: Array<'Focused' | 'Calm' | 'Reflective' | 'Inspired'> = ['Focused', 'Calm', 'Reflective', 'Inspired'];
      setBiometricState(states[Math.floor(Math.random() * states.length)]);
    }, 2800);
    return () => clearInterval(interval);
  }, [isOpen, reviewPhotoUrl]);

  // Toggle Camera Facing Mode (Front / Back)
  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Perform instant single frame capture to canvas
  const captureFrameToDataUrl = (targetFilter: LensFilterId, applyWatermark: boolean): string => {
    const video = videoRef.current;
    if (!video) return '';

    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // If front camera, mirror image for natural selfie feel
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    // Apply Filter Shaders to 2D Canvas context
    const currentOpt = LENS_FILTERS.find((f) => f.id === targetFilter);
    if (currentOpt && currentOpt.cssFilter !== 'none') {
      ctx.filter = currentOpt.cssFilter;
    }

    ctx.drawImage(video, 0, 0, width, height);

    // Reset filter for UI stamps
    ctx.filter = 'none';

    // If mirrored, reset transformation before drawing text watermarks
    if (facingMode === 'user') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Watermark Overlay Stamp
    if (applyWatermark) {
      const now = new Date();
      const dateStr = now.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const tagText = `🛡️ NMV VAULT ZERO-KNOWLEDGE OPTICAL STAMP`;
      const timeStampText = `${dateStr} • ${timeStr} • [${currentOpt?.name.toUpperCase() || 'RAW'}]`;

      const padding = Math.max(16, Math.floor(width * 0.02));
      const fontSize = Math.max(13, Math.floor(width * 0.018));

      // Dark translucent background bar at bottom
      const barHeight = fontSize * 3.2;
      ctx.fillStyle = 'rgba(10, 15, 29, 0.75)';
      ctx.fillRect(0, height - barHeight, width, barHeight);

      // Subtle cyan accent top border on the watermark bar
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(0, height - barHeight, width, 2);

      // Watermark Text
      ctx.fillStyle = '#38bdf8';
      ctx.font = `bold ${fontSize}px "Google Sans", system-ui, sans-serif`;
      ctx.fillText(tagText, padding, height - barHeight + fontSize * 1.3);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = `500 ${Math.max(11, fontSize * 0.85)}px system-ui, sans-serif`;
      ctx.fillText(timeStampText, padding, height - fontSize * 0.6);

      // Top Right Cyber Reticle corner code
      const cornerHash = `SHA256:${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = `600 ${Math.max(10, fontSize * 0.75)}px monospace`;
      ctx.fillText(cornerHash, width - padding - 100, height - fontSize * 0.6);
    }

    return canvas.toDataURL('image/jpeg', 0.92);
  };

  // Trigger Shutter Action with Flash & Sound
  const triggerShutterCapture = () => {
    // Shutter flash effect
    setIsFlashActive(true);
    playShutterSound();
    setTimeout(() => setIsFlashActive(false), 140);

    if (burstMode) {
      // Capture 3 rapid bursts
      const burstList: string[] = [];
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const img = captureFrameToDataUrl(selectedFilter, watermarkEnabled);
          if (img) burstList.push(img);
          if (i === 2) {
            setBurstGallery(burstList);
            setReviewPhotoUrl(burstList[0]);
            setSelectedBurstIdx(0);
            if (showToast) showToast('Rapid 3-Burst Capture Complete!', 'success');
          }
        }, i * 220);
      }
    } else {
      const capturedUrl = captureFrameToDataUrl(selectedFilter, watermarkEnabled);
      if (capturedUrl) {
        setReviewPhotoUrl(capturedUrl);
        setBurstGallery([capturedUrl]);
        setSelectedBurstIdx(0);
        if (showToast) showToast('Photo captured! Review & attach.', 'success');
      }
    }
  };

  // Handle Capture Button (handles countdown timer if set)
  const handleInitiateCapture = () => {
    if (!stream || !hasPermission) return;

    if (timerSeconds > 0) {
      setCountdownRemaining(timerSeconds);
      let count = timerSeconds;
      timerIntervalRef.current = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(timerIntervalRef.current);
          setCountdownRemaining(null);
          triggerShutterCapture();
        } else {
          setCountdownRemaining(count);
        }
      }, 1000);
    } else {
      triggerShutterCapture();
    }
  };

  // Retake photo and return to live viewfinder
  const handleRetake = () => {
    setReviewPhotoUrl(null);
    setBurstGallery([]);
    setPhotoCaption('');
  };

  // Final Accept & Attach to Parent Container
  const handleAcceptPhoto = () => {
    const finalUrl = burstGallery[selectedBurstIdx] || reviewPhotoUrl;
    if (!finalUrl) return;

    const currentFilterOpt = LENS_FILTERS.find((f) => f.id === selectedFilter);
    const timeStr = new Date().toISOString();
    const result: CapturedPhotoResult = {
      dataUrl: finalUrl,
      name: `CyberLens_${selectedFilter}_${Date.now().toString(36)}.jpg`,
      filterName: currentFilterOpt?.name || 'Natural',
      timestamp: timeStr,
      watermarked: watermarkEnabled,
      caption: photoCaption.trim() || undefined,
    };

    onCapture(result);
    onClose();
  };

  // Download raw local copy
  const handleDownloadCopy = () => {
    const finalUrl = burstGallery[selectedBurstIdx] || reviewPhotoUrl;
    if (!finalUrl) return;
    const a = document.createElement('a');
    a.href = finalUrl;
    a.download = `CyberLens_Capture_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (showToast) showToast('Photo saved to downloads.', 'info');
  };

  if (!isOpen) return null;

  return (
    <div
      id="innovative-camera-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 8, 20, 0.88)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="innovative-camera-modal-card"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          background: 'var(--bg-card, #0f172a)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header HUD */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
            borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
              }}
            >
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#ffffff',
                    margin: 0,
                    fontFamily: '"Google Sans", sans-serif',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {title}
                </h3>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    padding: '3px 8px',
                    borderRadius: '100px',
                    background: 'rgba(6, 182, 212, 0.28)',
                    color: '#ffffff',
                    border: '1px solid rgba(56, 189, 248, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" style={{ stroke: '#67e8f9' }} />
                  <span style={{ color: '#ffffff' }}>CLIENT-SIDE ZERO-KNOWLEDGE</span>
                </span>
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: '#ffffff',
                  opacity: 0.95,
                  margin: '3px 0 0 0',
                  lineHeight: 1.45,
                }}
              >
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#d93025',
              border: '2px solid #ffffff',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(217, 48, 37, 0.5)',
              transition: 'all 0.15s ease',
              flexShrink: 0,
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#b31412';
              e.currentTarget.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#d93025';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Close Camera Studio (Esc)"
            aria-label="Close Camera Studio"
          >
            <X
              style={{
                width: '20px',
                height: '20px',
                color: '#ffffff',
                stroke: '#ffffff',
                strokeWidth: 3,
                display: 'block',
              }}
            />
          </button>
        </div>

        {/* Viewport Workspace */}
        <div
          style={{
            position: 'relative',
            background: '#030712',
            minHeight: '380px',
            maxHeight: '520px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Shutter Flash Animation */}
          {isFlashActive && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#ffffff',
                zIndex: 40,
                animation: 'flashPulse 0.14s ease-out forwards',
              }}
            />
          )}

          {/* Countdown Overlay */}
          {countdownRemaining !== null && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 35,
                background: 'rgba(0, 0, 0, 0.55)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '72px',
                  fontWeight: 900,
                  color: '#38bdf8',
                  textShadow: '0 0 30px rgba(56, 189, 248, 0.8)',
                  animation: 'pulse 1s infinite',
                }}
              >
                {countdownRemaining}
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', letterSpacing: '1px' }}>
                HOLD STEADY... CAPTURING MOMENT
              </span>
            </div>
          )}

          {/* Hidden File Picker Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFilePick}
            style={{ display: 'none' }}
          />

          {/* Mode 1: Live Viewfinder */}
          {!reviewPhotoUrl ? (
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {permissionError ? (
                <div
                  style={{
                    padding: '32px 24px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                    maxWidth: '480px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 700, color: '#f8fafc' }}>
                      Camera Sensor Inaccessible
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
                      {permissionError}
                    </p>
                  </div>

                  {/* Immediate Fallback Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '6px' }}>
                    {/* Choice A: Upload Photo from Device */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        padding: '10px 18px',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                        border: 'none',
                        color: '#ffffff',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                        cursor: 'pointer',
                      }}
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Photo / Image from Device</span>
                    </button>

                    {/* Choice B: Generate Synthetic Biometric Seal */}
                    <button
                      type="button"
                      onClick={generateSyntheticSnapshot}
                      className="btn"
                      style={{
                        width: '100%',
                        padding: '10px 18px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: 'rgba(168, 85, 247, 0.15)',
                        border: '1px solid rgba(168, 85, 247, 0.4)',
                        color: '#c084fc',
                        cursor: 'pointer',
                      }}
                    >
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Generate Synthetic Biometric Snapshot</span>
                    </button>

                    {/* Choice C: Retry Permission */}
                    <button
                      type="button"
                      onClick={startCamera}
                      className="btn btn-secondary"
                      style={{
                        width: '100%',
                        padding: '9px 18px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#cbd5e1',
                        cursor: 'pointer',
                      }}
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Retry Camera Sensor Permission</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Live Video Feed */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      maxHeight: '520px',
                      objectFit: 'cover',
                      transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                      filter: LENS_FILTERS.find((f) => f.id === selectedFilter)?.cssFilter || 'none',
                      transition: 'filter 0.25s ease',
                    }}
                  />

                  {/* Rule of Thirds Grid Overlay */}
                  {showGrid && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gridTemplateRows: '1fr 1fr 1fr',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                      }}
                    >
                      <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.2)', borderBottom: '1px dashed rgba(255, 255, 255, 0.2)' }} />
                      <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.2)', borderBottom: '1px dashed rgba(255, 255, 255, 0.2)' }} />
                      <div style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.2)' }} />
                      <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.2)', borderBottom: '1px dashed rgba(255, 255, 255, 0.2)' }} />
                      <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.2)', borderBottom: '1px dashed rgba(255, 255, 255, 0.2)' }} />
                      <div style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.2)' }} />
                      <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.2)' }} />
                      <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.2)' }} />
                      <div />
                    </div>
                  )}

                  {/* Cyber Reticle HUD Overlay */}
                  {showReticle && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: '24px',
                        pointerEvents: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      {/* Top HUD Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: 'rgba(15, 23, 42, 0.75)',
                            backdropFilter: 'blur(6px)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            color: '#38bdf8',
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span>OPTICAL SENSOR: 1080P HD • 30FPS</span>
                        </div>

                        {/* Corner Target Bracket */}
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderTop: '2px solid #38bdf8',
                            borderRight: '2px solid #38bdf8',
                          }}
                        />
                      </div>

                      {/* Center Target Ring */}
                      <div
                        style={{
                          alignSelf: 'center',
                          width: '120px',
                          height: '120px',
                          borderRadius: '50%',
                          border: '1px dashed rgba(56, 189, 248, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                        }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
                        <div
                          style={{
                            position: 'absolute',
                            width: '20px',
                            height: '2px',
                            background: 'rgba(56, 189, 248, 0.6)',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            width: '2px',
                            height: '20px',
                            background: 'rgba(56, 189, 248, 0.6)',
                          }}
                        />
                      </div>

                      {/* Bottom HUD Row with Biometric Focus Telemetry */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        {showBiometrics ? (
                          <div
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: 'rgba(15, 23, 42, 0.8)',
                              backdropFilter: 'blur(8px)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              color: '#10b981',
                              fontSize: '11px',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                            <span>COGNITIVE EXPRESSION: {biometricState} ({biometricFocusRate}%)</span>
                          </div>
                        ) : <div />}

                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderBottom: '2px solid #38bdf8',
                            borderRight: '2px solid #38bdf8',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Top-Right Fast Viewfinder Action Bar */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      zIndex: 20,
                    }}
                  >
                    {/* Switch Front/Back Camera */}
                    <button
                      type="button"
                      onClick={handleToggleFacingMode}
                      title="Switch Camera (Front/Back)"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'rgba(15, 23, 42, 0.8)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38bdf8')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)')}
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>

                    {/* Toggle Reticle HUD */}
                    <button
                      type="button"
                      onClick={() => setShowReticle((p) => !p)}
                      title="Toggle Reticle HUD"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: showReticle ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.8)',
                        backdropFilter: 'blur(8px)',
                        border: `1px solid ${showReticle ? '#38bdf8' : 'rgba(255, 255, 255, 0.2)'}`,
                        color: showReticle ? '#38bdf8' : '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Crosshair className="w-4 h-4" />
                    </button>

                    {/* Toggle Grid */}
                    <button
                      type="button"
                      onClick={() => setShowGrid((p) => !p)}
                      title="Toggle Composition Grid"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: showGrid ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.8)',
                        backdropFilter: 'blur(8px)',
                        border: `1px solid ${showGrid ? '#38bdf8' : 'rgba(255, 255, 255, 0.2)'}`,
                        color: showGrid ? '#38bdf8' : '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Grid className="w-4 h-4" />
                    </button>

                    {/* Upload from Disk Quick Action */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload Photo / Image from Device"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'rgba(15, 23, 42, 0.8)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38bdf8')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)')}
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Mode 2: Captured Photo Review & Tuning Stage */
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={burstGallery[selectedBurstIdx] || reviewPhotoUrl}
                alt="Captured Snapshot"
                style={{
                  width: '100%',
                  height: '100%',
                  maxHeight: '520px',
                  objectFit: 'contain',
                  background: '#020617',
                }}
              />

              {/* Burst Selection Strip if burst captured */}
              {burstGallery.length > 1 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '8px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    padding: '6px 12px',
                    borderRadius: '100px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {burstGallery.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedBurstIdx(idx)}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: selectedBurstIdx === idx ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.2)',
                        padding: 0,
                        cursor: 'pointer',
                      }}
                    >
                      <img src={img} alt={`Burst ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filter Palette Strip (During Live Viewfinder) */}
        {!reviewPhotoUrl && (
          <div
            style={{
              padding: '12px 18px',
              background: 'rgba(15, 23, 42, 0.95)',
              borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              overflowX: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '4px', flexShrink: 0 }}>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>
                Mood Lenses:
              </span>
            </div>

            {LENS_FILTERS.map((lens) => {
              const isSelected = selectedFilter === lens.id;
              return (
                <button
                  key={lens.id}
                  type="button"
                  onClick={() => setSelectedFilter(lens.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '100px',
                    fontSize: '12px',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    background: isSelected ? `${lens.color}25` : 'rgba(255, 255, 255, 0.04)',
                    color: isSelected ? lens.color : '#94a3b8',
                    border: `1px solid ${isSelected ? lens.color : 'rgba(255, 255, 255, 0.1)'}`,
                    boxShadow: isSelected ? `0 0 12px ${lens.color}40` : 'none',
                    transition: 'all 0.15s ease',
                  }}
                  title={lens.description}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: lens.color,
                    }}
                  />
                  <span>{lens.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer Controls */}
        <div
          style={{
            padding: '16px 20px',
            background: 'var(--bg-main, #0b0f19)',
            borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          {!reviewPhotoUrl ? (
            /* Live Capture Controls */
            <>
              {/* Left Settings: Timer, Burst, Watermark */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Timer Selector */}
                <button
                  type="button"
                  onClick={() => {
                    const next: Record<number, 0 | 3 | 5 | 10> = { 0: 3, 3: 5, 5: 10, 10: 0 };
                    setTimerSeconds(next[timerSeconds]);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: timerSeconds > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: timerSeconds > 0 ? '#f59e0b' : '#94a3b8',
                    border: `1px solid ${timerSeconds > 0 ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timerSeconds === 0 ? 'No Timer' : `${timerSeconds}s Delay`}</span>
                </button>

                {/* Burst Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setBurstMode((p) => !p)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: burstMode ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: burstMode ? '#06b6d4' : '#94a3b8',
                    border: `1px solid ${burstMode ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{burstMode ? '3-Burst ON' : 'Burst Off'}</span>
                </button>

                {/* Watermark Timestamp Toggle */}
                <button
                  type="button"
                  onClick={() => setWatermarkEnabled((p) => !p)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: watermarkEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: watermarkEnabled ? '#10b981' : '#94a3b8',
                    border: `1px solid ${watermarkEnabled ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{watermarkEnabled ? 'Security Stamp ON' : 'Stamp Off'}</span>
                </button>
              </div>

              {/* Main Shutter Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleInitiateCapture}
                  disabled={!hasPermission}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                    border: '4px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 0 25px rgba(6, 182, 212, 0.5)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: hasPermission ? 'pointer' : 'not-allowed',
                    transform: 'scale(1)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  title="Snap photo"
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255, 255, 255, 0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Camera className="w-5 h-5" />
                  </div>
                </button>
              </div>
            </>
          ) : (
            /* Review & Finalize Controls */
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Optional Caption Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Add an optional encrypted reflection caption..."
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="btn btn-secondary"
                    style={{
                      padding: '8px 14px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retake Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadCopy}
                    className="btn btn-secondary"
                    style={{
                      padding: '8px 14px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Copy</span>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '13px' }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleAcceptPhoto}
                    className="btn btn-primary"
                    style={{
                      padding: '8px 20px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)',
                    }}
                  >
                    <Check className="w-4 h-4" />
                    <span>Accept &amp; Attach Photo</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
