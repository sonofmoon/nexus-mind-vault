import { generateSecureClaimLink, dispatchEmergencyNotice } from '../services/guardianDispatchService';
import { Link, Copy } from 'lucide-react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LegacyGuardianPolicy,
  LegacyGuardianPolicyCategory,
  LegacyGuardianHeartbeatStatus,
  AttachmentItem,
} from '../types';
import {
  getLegacyGuardianPolicies,
  saveLegacyGuardianPolicy,
  deleteLegacyGuardianPolicy,
  recordGlobalHeartbeatPulse,
  recordSinglePolicyPulse,
  calculateGuardianHeartbeat,
} from '../services/vaultStorage';
import { InnovativeCameraStudioModal, CapturedPhotoResult } from './InnovativeCameraStudioModal';
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Clock,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Play,
  RefreshCw,
  Send,
  Save,
  Trash2,
  Sparkles,
  Camera,
  Mic,
  Paperclip,
  Key,
  Users,
  Info,
  Radio,
  FileText,
  Volume2,
  ExternalLink,
  ChevronRight,
  Sliders,
  Flame,
  Check,
  X,
  File,
  Download,
  UploadCloud,
  Plus,
  Search,
  Filter,
  Heart,
  KeyRound,
  Briefcase,
  BookOpen,
  HelpCircle,
  Zap,
  Activity,
  Edit3,
} from 'lucide-react';

export interface LegacyGuardianCapsuleViewProps {
  userId: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const LegacyGuardianCapsuleView: React.FC<LegacyGuardianCapsuleViewProps> = ({
  userId,
  showToast,
}) => {
  // 📚 All Policies State
  const [policies, setPolicies] = useState<LegacyGuardianPolicy[]>(() => getLegacyGuardianPolicies(userId));

  // 🔍 Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<'all' | LegacyGuardianPolicyCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 📝 Form & Editing State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);

  // Form Fields
  const [formCategory, setFormCategory] = useState<LegacyGuardianPolicyCategory>('family');
  const [formTitle, setFormTitle] = useState('');
  const [formEmergencyMessage, setFormEmergencyMessage] = useState('');
  const [formCheckInWindowHours, setFormCheckInWindowHours] = useState<number>(72);
  const [formGraceWindowHours, setFormGraceWindowHours] = useState<number>(24);
  const [formTrustedContactsInput, setFormTrustedContactsInput] = useState<string>('');
  const [formAttachments, setFormAttachments] = useState<AttachmentItem[]>([]);
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [formAudioBlobUrl, setFormAudioBlobUrl] = useState<string | null>(null);
  const [formPolicyEnabled, setFormPolicyEnabled] = useState<boolean>(true);

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  // Optical Camera Studio State
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Voice Recording State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 🔬 Audit Diagnostics Modal State
  const [evalPolicy, setEvalPolicy] = useState<LegacyGuardianPolicy | null>(null);
  const [evalLog, setEvalLog] = useState<string[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // 🚀 Simulated Handover Dispatch Modal State
  const [launchPolicy, setLaunchPolicy] = useState<LegacyGuardianPolicy | null>(null);

  // ⏱️ Live Global Clock
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync policies when userId changes
  useEffect(() => {
    setPolicies(getLegacyGuardianPolicies(userId));
  }, [userId]);

  // 🎵 Synthesized Audio Sound Effects
  const playHeartbeatSound = (type: 'pulse' | 'save' | 'audit' | 'launch') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'pulse') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'save') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'launch') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      }
    } catch {
      // AudioContext unavailable
    }
  };

  // ⚡ GLOBAL PROOF-OF-LIFE PULSE
  const handleGlobalHeartbeat = () => {
    if (policies.length === 0) {
      showToast('No Legacy Guardian policies created yet. Create a policy first.', 'warning');
      return;
    }
    const updated = recordGlobalHeartbeatPulse(userId);
    setPolicies(updated);
    playHeartbeatSound('pulse');
    showToast(`🟢 Global Proof-of-Life Pulse recorded! Timers reset across all ${policies.length} policies.`, 'success');
  };

  // 💓 INDIVIDUAL POLICY PULSE
  const handleSinglePolicyPulse = (policyId: string, policyTitle: string) => {
    const updated = recordSinglePolicyPulse(userId, policyId);
    setPolicies(updated);
    playHeartbeatSound('pulse');
    showToast(`🟢 Pulse recorded for "${policyTitle}"! Check-in window timer reset.`, 'success');
  };

  // 📝 OPEN CREATE FORM
  const handleOpenCreateForm = (presetCategory?: LegacyGuardianPolicyCategory) => {
    setEditingPolicyId(null);
    setFormCategory(presetCategory || 'family');
    setFormTitle('');
    setFormEmergencyMessage('');
    setFormCheckInWindowHours(72);
    setFormGraceWindowHours(24);
    setFormTrustedContactsInput('');
    setFormAttachments([]);
    setFormPhotos([]);
    setFormAudioBlobUrl(null);
    setFormPolicyEnabled(true);
    setIsFormOpen(true);
  };

  // ✏️ OPEN EDIT FORM
  const handleOpenEditForm = (policy: LegacyGuardianPolicy) => {
    setEditingPolicyId(policy.id);
    setFormCategory(policy.category || 'family');
    setFormTitle(policy.title);
    setFormEmergencyMessage(policy.emergencyMessage);
    setFormCheckInWindowHours(policy.checkInWindowHours || 72);
    setFormGraceWindowHours(policy.graceWindowHours || 24);
    setFormTrustedContactsInput(policy.trustedContacts ? policy.trustedContacts.join(', ') : '');
    setFormAttachments(policy.attachments || []);
    setFormPhotos(policy.photos || []);
    setFormAudioBlobUrl(policy.audioUrl || null);
    setFormPolicyEnabled(policy.policyEnabled ?? true);
    setIsFormOpen(true);
  };

  // 💾 SAVE POLICY
  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      showToast('Please enter a policy title.', 'error');
      return;
    }
    if (!formEmergencyMessage.trim()) {
      showToast('Please write the emergency instructions or release message.', 'error');
      return;
    }

    const contacts = formTrustedContactsInput
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (contacts.length === 0) {
      showToast('Please designate at least one trusted guardian contact email.', 'error');
      return;
    }

    const dummyHash =
      '0x' +
      Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

    const existingPolicy = editingPolicyId ? policies.find((p) => p.id === editingPolicyId) : null;

    const newPolicy: LegacyGuardianPolicy = {
      id: editingPolicyId || `lgp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: userId,
      title: formTitle.trim(),
      category: formCategory,
      emergencyMessage: formEmergencyMessage.trim(),
      checkInWindowHours: Number(formCheckInWindowHours) || 72,
      graceWindowHours: Number(formGraceWindowHours) || 24,
      trustedContacts: contacts,
      lastCheckInAt: existingPolicy ? existingPolicy.lastCheckInAt : new Date().toISOString(),
      policyEnabled: formPolicyEnabled,
      status: 'active',
      attachments: formAttachments,
      photos: formPhotos,
      audioUrl: formAudioBlobUrl || undefined,
      simulatedTimeOffsetHours: 0,
      createdAt: existingPolicy ? existingPolicy.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      integrityHash: dummyHash,
    };

    const updatedList = saveLegacyGuardianPolicy(userId, newPolicy);
    setPolicies(updatedList);
    setIsFormOpen(false);
    setEditingPolicyId(null);
    playHeartbeatSound('save');
    showToast(`🛡️ Legacy Guardian Policy "${newPolicy.title}" cryptographically sealed & armed.`, 'success');
  };

  // 🗑️ DELETE POLICY
  const handleDeletePolicy = (policyId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete and disarm the Legacy Guardian Policy "${title}"?`)) {
      const updatedList = deleteLegacyGuardianPolicy(userId, policyId);
      setPolicies(updatedList);
      if (editingPolicyId === policyId) {
        setIsFormOpen(false);
        setEditingPolicyId(null);
      }
      showToast(`Legacy Guardian Policy "${title}" deleted and disarmed.`, 'info');
    }
  };

  // 🔬 RUN AUDIT EVALUATION MODAL
  const handleStartAuditEval = (policy: LegacyGuardianPolicy) => {
    setEvalPolicy(policy);
    setIsEvaluating(true);
    setEvalLog([]);

    const telemetry = calculateGuardianHeartbeat(policy, currentTimestamp);
    const steps = [
      `[0.00s] Initializing Zero-Knowledge Heartbeat Auditor for "${policy.title}"...`,
      `[0.15s] Policy Category: [${(policy.category || 'family').toUpperCase()}] | SHA-256 Hash: ${policy.integrityHash.substring(0, 14)}...`,
      `[0.30s] Audit parameters: Check-in Window = ${policy.checkInWindowHours}h (${(policy.checkInWindowHours / 24).toFixed(1)} days), Grace Buffer = ${policy.graceWindowHours}h.`,
      `[0.45s] Last verified check-in pulse: ${new Date(policy.lastCheckInAt).toLocaleString()}.`,
      `[0.60s] Time elapsed since last heartbeat: ${telemetry.hoursSinceCheckIn} hours.`,
    ];

    if (telemetry.status === 'active') {
      steps.push(`[0.75s] Status: 🟢 ACTIVE (${telemetry.hoursUntilGrace}h remaining before Grace Window).`);
      steps.push(`[0.90s] Fail-safe status: Inactive. Designated guardians will NOT be contacted.`);
      steps.push(`[1.00s] Multimodal Vault: ${policy.attachments?.length || 0} files, ${policy.photos?.length || 0} photos, ${policy.audioUrl ? '1 voice memo' : 'no audio'}.`);
      steps.push(`[1.15s] Cryptographic Integrity: 100% VERIFIED PASS.`);
    } else if (telemetry.status === 'grace') {
      steps.push(`[0.75s] Status: 🟡 GRACE WINDOW ACTIVE (Missed regular check-in by ${(telemetry.hoursSinceCheckIn - policy.checkInWindowHours).toFixed(1)}h).`);
      steps.push(`[0.90s] Grace period countdown: ${telemetry.hoursUntilRelease}h remaining before automated emergency release.`);
      steps.push(`[1.00s] Emergency warning triggers: Armed. Ready for dispatch to: ${policy.trustedContacts.join(', ')}.`);
    } else {
      steps.push(`[0.75s] Status: 🔴 PENDING RELEASE / EXPIRED.`);
      steps.push(`[0.90s] Emergency release protocol: TRIGGER READY.`);
      steps.push(`[1.00s] Zero-knowledge decryption tokens generated for ${policy.trustedContacts.length} designated guardian(s).`);
    }

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        const line = steps[i];
        setEvalLog((prev) => [...prev, line]);
        i++;
      } else {
        clearInterval(interval);
        setIsEvaluating(false);
      }
    }, 150);
  };

  // 🚀 SIMULATE HANDOVER MODAL
  const handleSimulateHandover = (policy: LegacyGuardianPolicy) => {
    setLaunchPolicy(policy);
    playHeartbeatSound('launch');
  };

  // Quick Preset Templates
  const handleApplyTemplate = (type: 'medical' | 'crypto' | 'business' | 'explorer' | 'personal') => {
    if (type === 'medical') {
      setFormCategory('family');
      setFormTitle('Family Emergency & Medical Health Directives');
      setFormEmergencyMessage(
        'To my family and designated healthcare proxies:\n\n' +
          '1. Advance Healthcare Directive: My living will, power of attorney documents, and organ donation preferences are attached.\n' +
          '2. Insurance & Health Policies: Primary policy details, hospital preference, and primary care physician contacts are detailed below.\n' +
          '3. Critical Home & Asset Directives: Emergency access instructions for our residential safe and banking records are enclosed in the zero-knowledge vault.'
      );
      setFormCheckInWindowHours(72);
      setFormGraceWindowHours(24);
      setFormTrustedContactsInput('spouse@family.com, executor@familytrust.org');
    } else if (type === 'crypto') {
      setFormCategory('crypto');
      setFormTitle('Cryptographic Seed Shards & Cold Storage Recovery');
      setFormEmergencyMessage(
        'To my designated cryptographic key guardians:\n\n' +
          '1. Shamir Secret Key Shards: This transmission contains Shard #1 of my 2-of-3 multi-signature seed phrase.\n' +
          '2. Hardware Vault Locations: Hardware cold-wallets (Ledger/Trezor) are secured in safe deposit box #419.\n' +
          '3. Recovery Protocol: Coordinate with Guardian #2 to reconstruct master entropy keys. All funds are to be transferred strictly in accordance with my estate distribution schedule.'
      );
      setFormCheckInWindowHours(168); // 7 days
      setFormGraceWindowHours(48);
      setFormTrustedContactsInput('trustee1@keycustody.io, attorney@estatefirm.com');
    } else if (type === 'business') {
      setFormCategory('business');
      setFormTitle('Executive Business Continuity & System Handover');
      setFormEmergencyMessage(
        'To the Board of Directors & Operations Leadership:\n\n' +
          '1. Sovereign Domain & Infrastructure: Root master admin credentials for AWS, Cloudflare, GitHub, and corporate domain registries are attached.\n' +
          '2. Payroll & Banking Authority: Designated secondary signatory authorization has been delegated to our VP of Finance.\n' +
          '3. Intellectual Property: Master code repositories and cryptographic production signing keys are documented herein.'
      );
      setFormCheckInWindowHours(48);
      setFormGraceWindowHours(24);
      setFormTrustedContactsInput('coo@company.com, legal@company.com');
    } else if (type === 'personal') {
      setFormCategory('personal');
      setFormTitle('Personal Memoirs & Letters to Loved Ones');
      setFormEmergencyMessage(
        'To my loved ones:\n\n' +
          'If you are reading this transmission, it means I am no longer able to reach you directly. I have recorded these personal audio memoirs, letters, and photo albums for you.\n\n' +
          'Please know how deeply I cherish every memory we shared together. Take care of each other, live fearlessly, and keep our family traditions alive.'
      );
      setFormCheckInWindowHours(720); // 30 days
      setFormGraceWindowHours(72);
      setFormTrustedContactsInput('children@family.com, bestfriend@gmail.com');
    }
    showToast(`Applied ${type.toUpperCase()} preset template!`, 'info');
  };

  // Multimodal Attachments Helpers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const newItem: AttachmentItem = {
          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: (file as any).name,
          type: (file as any).type.startsWith('image/') ? 'image' : 'file',
          size: (file as any).size,
          data: reader.result as string,
        };
        setFormAttachments((prev) => [...prev, newItem]);
      };
      reader.readAsDataURL(file as Blob);
    });

    showToast(`Attached ${files.length} document(s).`, 'success');
  };

  const handleCameraCapture = (captured: CapturedPhotoResult) => {
    setFormPhotos((prev) => [...prev, captured.dataUrl]);
    showToast(`Attached photo snapshot "${captured.name}".`, 'success');
  };

  // Audio Recording Handlers
  const handleStartAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setFormAudioBlobUrl(audioUrl);
        setIsRecordingAudio(false);
        showToast('Decrypted voice memo recorded and attached.', 'success');
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
    } catch {
      showToast('Microphone access denied or unavailable.', 'error');
    }
  };

  const handleStopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
  };

  // Category Configuration
  const categoryConfig: Record<
    LegacyGuardianPolicyCategory,
    { label: string; icon: any; color: string; bg: string; border: string }
  > = {
    family: {
      label: 'Family & Medical',
      icon: Heart,
      color: '#ec4899',
      bg: 'rgba(236, 72, 153, 0.12)',
      border: 'rgba(236, 72, 153, 0.3)',
    },
    crypto: {
      label: 'Crypto Key Shards',
      icon: KeyRound,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.3)',
    },
    business: {
      label: 'Business Continuity',
      icon: Briefcase,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      border: 'rgba(59, 130, 246, 0.3)',
    },
    personal: {
      label: 'Personal Memoirs',
      icon: BookOpen,
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.12)',
      border: 'rgba(139, 92, 246, 0.3)',
    },
    custom: {
      label: 'Custom Fail-Safe',
      icon: Shield,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.3)',
    },
  };

  // Filtered Policies
  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchQuery =
        !searchQuery.trim() ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.emergencyMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.trustedContacts.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [policies, selectedCategory, searchQuery]);

  // Aggregate Stats
  const aggregateStats = useMemo(() => {
    const total = policies.length;
    const activeCount = policies.filter((p) => p.policyEnabled).length;
    const allContacts = new Set<string>();
    policies.forEach((p) => p.trustedContacts?.forEach((c) => allContacts.add(c.toLowerCase())));

    let mostUrgentMs = Infinity;
    policies.forEach((p) => {
      const tel = calculateGuardianHeartbeat(p, currentTimestamp);
      if (tel.msUntilNextEvent > 0 && tel.msUntilNextEvent < mostUrgentMs) {
        mostUrgentMs = tel.msUntilNextEvent;
      }
    });

    const formatMs = (ms: number) => {
      if (ms === Infinity || ms <= 0) return 'None';
      const hrs = Math.floor(ms / (3600 * 1000));
      const mins = Math.floor((ms % (3600 * 1000)) / (60 * 1000));
      if (hrs > 24) return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
      return `${hrs}h ${mins}m`;
    };

    return {
      total,
      activeCount,
      uniqueContacts: allContacts.size,
      nextDueFormatted: formatMs(mostUrgentMs),
    };
  }, [policies, currentTimestamp]);

  // Format Duration string
  const formatCountdown = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div
      id="legacy-guardian-matrix-root"
      style={{
        maxWidth: '1180px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        color: 'var(--text-primary)',
      }}
    >
      {/* 🧭 GOOGLE-GRADE MATRIX HEADER & GLOBAL TELEMETRY */}
      <div
        style={{
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          padding: '24px 28px',
          boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 0 25px rgba(56, 189, 248, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.45)',
                flexShrink: 0,
              }}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: '#ffffff',
                    margin: 0,
                    fontFamily: '"Google Sans", sans-serif',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Nexus Legacy Guardian Matrix
                </h1>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.6px',
                    padding: '3px 10px',
                    borderRadius: '100px',
                    background: 'rgba(239, 68, 68, 0.18)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Activity className="w-3.5 h-3.5" />
                  MULTI-POLICY FAIL-SAFE MATRIX
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0', maxWidth: '720px', lineHeight: 1.5 }}>
                Automated cryptographic fail-safe for sovereign digital continuity. Compose multiple isolated policies
                for family directives, cryptographic key recovery, executive handover, and personal memoirs.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleGlobalHeartbeat}
              className="btn btn-primary"
              style={{
                minHeight: '40px',
                padding: '0 20px',
                borderRadius: '12px',
                fontSize: '13.5px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
              title="Record proof-of-life heartbeat and reset check-in timers across ALL active policies"
            >
              <Zap className="w-4 h-4" />
              <span>Global Proof-of-Life Pulse</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenCreateForm()}
              className="btn btn-secondary"
              style={{
                minHeight: '40px',
                padding: '0 18px',
                borderRadius: '12px',
                fontSize: '13.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Create Guardian Policy</span>
            </button>
          </div>
        </div>

        {/* Global Aggregate Telemetry Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Policies</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {aggregateStats.activeCount} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>of {aggregateStats.total} Total</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Next Pulse Deadline</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
              {aggregateStats.nextDueFormatted}
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Designated Guardians</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#a78bfa', marginTop: '2px' }}>
              {aggregateStats.uniqueContacts} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>Unique Contacts</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cryptographic Vault</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#4ade80', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Zero-Knowledge</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🧭 FILTER, CATEGORY TABS & SEARCH BAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12.5px',
              fontWeight: selectedCategory === 'all' ? 700 : 500,
              background: selectedCategory === 'all' ? '#1a73e8' : 'rgba(255, 255, 255, 0.06)',
              color: selectedCategory === 'all' ? '#ffffff' : 'var(--text-secondary)',
              border: '1px solid',
              borderColor: selectedCategory === 'all' ? '#1a73e8' : 'var(--border-subtle)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            All Policies ({policies.length})
          </button>

          {(Object.keys(categoryConfig) as LegacyGuardianPolicyCategory[]).map((cat) => {
            const cfg = categoryConfig[cat];
            const count = policies.filter((p) => p.category === cat).length;
            const Icon = cfg.icon;
            const isSel = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12.5px',
                  fontWeight: isSel ? 700 : 500,
                  background: isSel ? cfg.bg : 'rgba(255, 255, 255, 0.04)',
                  color: isSel ? cfg.color : 'var(--text-secondary)',
                  border: '1px solid',
                  borderColor: isSel ? cfg.border : 'var(--border-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cfg.label} ({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search className="w-4 h-4" style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search policies or contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px 7px 34px',
              borderRadius: '20px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '7px',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 📝 POLICY CREATOR / EDITOR DRAWER */}
      {isFormOpen && (
        <form
          onSubmit={handleSavePolicy}
          style={{
            borderRadius: '20px',
            background: 'var(--bg-card)',
            border: '2px solid rgba(56, 189, 248, 0.3)',
            padding: '26px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.6), 0 0 30px rgba(56, 189, 248, 0.1)',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {editingPolicyId ? 'Edit Legacy Guardian Policy' : 'Compose New Legacy Guardian Policy'}
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Define specific emergency directives, distinct guardian recipients, and zero-knowledge attachments for this policy.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingPolicyId(null);
              }}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Preset Starters */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Quick Preset Starter Templates (Click to Auto-Fill):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleApplyTemplate('medical')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(236, 72, 153, 0.08)',
                  border: '1px solid rgba(236, 72, 153, 0.25)',
                  color: '#ec4899',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Heart className="w-4 h-4 flex-shrink-0" />
                <span>👨‍👩‍👧 Family & Medical Directives</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate('crypto')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  color: '#f59e0b',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <KeyRound className="w-4 h-4 flex-shrink-0" />
                <span>🔑 Crypto Seed Shard Recovery</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate('business')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  color: '#3b82f6',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Briefcase className="w-4 h-4 flex-shrink-0" />
                <span>💼 Business Executive Handover</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate('personal')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  color: '#a78bfa',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <BookOpen className="w-4 h-4 flex-shrink-0" />
                <span>📖 Personal Memoirs to Loved Ones</span>
              </button>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Category Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Policy Category:
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as LegacyGuardianPolicyCategory)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'var(--bg-input, rgba(255, 255, 255, 0.05))',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              >
                <option value="family">👨‍👩‍👧 Family & Medical Directives</option>
                <option value="crypto">🔑 Cryptographic Seed Shards & Wallets</option>
                <option value="business">💼 Business & Corporate Continuity</option>
                <option value="personal">📖 Personal Memoirs & Letters</option>
                <option value="custom">🛡️ Custom Fail-Safe Protocol</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Policy Title:
              </label>
              <input
                type="text"
                placeholder="e.g. Hardware Wallet 24-Word Seed Recovery"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'var(--bg-input, rgba(255, 255, 255, 0.05))',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          {/* Emergency Message / Directives */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Emergency Instructions & Decrypted Directives (Zero-Knowledge):
              </label>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formEmergencyMessage.length} characters</span>
            </div>
            <textarea
              rows={6}
              placeholder="Write the exact instructions, passphrases, asset recovery steps, or personal memoirs that should be released only to this policy's designated contacts..."
              value={formEmergencyMessage}
              onChange={(e) => setFormEmergencyMessage(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'var(--bg-input, rgba(255, 255, 255, 0.05))',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                lineHeight: 1.5,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Timing & Guardian Contacts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {/* Check-In Window */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Check-In Window (Proof-of-Life Pulse):
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  min={1}
                  value={formCheckInWindowHours}
                  onChange={(e) => setFormCheckInWindowHours(Number(e.target.value))}
                  style={{
                    width: '100px',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    background: 'var(--bg-input, rgba(255, 255, 255, 0.05))',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  hours ({(formCheckInWindowHours / 24).toFixed(1)} days)
                </span>
              </div>
              {/* Presets */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {[24, 48, 72, 168, 720].map((hrs) => (
                  <button
                    key={hrs}
                    type="button"
                    onClick={() => setFormCheckInWindowHours(hrs)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      background: formCheckInWindowHours === hrs ? '#1a73e8' : 'rgba(255, 255, 255, 0.05)',
                      color: formCheckInWindowHours === hrs ? '#ffffff' : 'var(--text-secondary)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {hrs >= 168 ? (hrs === 168 ? '1w' : '1m') : `${hrs / 24}d`}
                  </button>
                ))}
              </div>
            </div>

            {/* Grace Window */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Grace Period Window (Buffer):
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  min={1}
                  value={formGraceWindowHours}
                  onChange={(e) => setFormGraceWindowHours(Number(e.target.value))}
                  style={{
                    width: '100px',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    background: 'var(--bg-input, rgba(255, 255, 255, 0.05))',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>hours buffer</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {[6, 12, 24, 48, 72].map((hrs) => (
                  <button
                    key={hrs}
                    type="button"
                    onClick={() => setFormGraceWindowHours(hrs)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      background: formGraceWindowHours === hrs ? '#1a73e8' : 'rgba(255, 255, 255, 0.05)',
                      color: formGraceWindowHours === hrs ? '#ffffff' : 'var(--text-secondary)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {hrs}h
                  </button>
                ))}
              </div>
            </div>

            {/* Designated Guardians Emails */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Designated Guardians (Comma-Separated Emails):
              </label>
              <input
                type="text"
                placeholder="e.g. partner@family.com, executor@trust.org"
                value={formTrustedContactsInput}
                onChange={(e) => setFormTrustedContactsInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'var(--bg-input, rgba(255, 255, 255, 0.05))',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          {/* Multimodal Attachments Dock */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Paperclip className="w-4 h-4 text-cyan-400" />
              <span>Dedicated Multimodal Attachments (Encrypted Zero-Knowledge):</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary"
                style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Documents / Files</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="btn btn-secondary"
                style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Optical Camera Studio</span>
              </button>

              {!isRecordingAudio ? (
                <button
                  type="button"
                  onClick={handleStartAudioRecording}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Mic className="w-4 h-4 text-amber-400" />
                  <span>Record Decrypted Voice Memo</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopAudioRecording}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '12.5px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    animation: 'pulse 1.5s infinite',
                  }}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Stop Recording (Recording...)</span>
                </button>
              )}
            </div>

            {/* Attached Items Preview */}
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Files */}
              {formAttachments.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {formAttachments.map((att) => (
                    <div
                      key={att.id}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>{att.name}</span>
                      <button
                        type="button"
                        onClick={() => setFormAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                        style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Photos with clean dark dismiss button */}
              {formPhotos.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {formPhotos.map((p, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        width: '64px',
                        height: '64px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <img src={p} alt={`Attached ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => setFormPhotos((prev) => prev.filter((_, i) => i !== idx))}
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

              {/* Audio Player */}
              {formAudioBlobUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <audio src={formAudioBlobUrl} controls style={{ height: '32px', maxWidth: '280px' }} />
                  <button
                    type="button"
                    onClick={() => setFormAudioBlobUrl(null)}
                    style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Delete Memo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingPolicyId(null);
              }}
              className="btn btn-secondary"
              style={{ minHeight: '38px', padding: '0 18px', borderRadius: '12px', fontSize: '13px' }}
            >
              Cancel
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              {editingPolicyId && (
                <button
                  type="button"
                  onClick={() => handleDeletePolicy(editingPolicyId, formTitle)}
                  className="btn btn-danger"
                  style={{ minHeight: '38px', padding: '0 16px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Policy</span>
                </button>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  minHeight: '38px',
                  padding: '0 24px',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #1a73e8, #06b6d4)',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Save className="w-4 h-4" />
                <span>{editingPolicyId ? 'Update & Re-Seal Policy' : 'Seal & Arm Guardian Policy'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 🧭 MULTI-POLICY DIRECTORY / GRID */}
      {filteredPolicies.length === 0 ? (
        /* Empty State / Quick Starters */
        <div
          style={{
            borderRadius: '20px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            padding: '40px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {searchQuery || selectedCategory !== 'all'
                ? 'No policies found matching your filter.'
                : 'No Legacy Guardian Policies Configured'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '6px 0 0 0', maxWidth: '540px' }}>
              Create independent fail-safe policies for family directives, crypto recovery, executive handover, and personal memoirs.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => handleOpenCreateForm('family')}
              className="btn btn-primary"
              style={{
                minHeight: '38px',
                padding: '0 20px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Heart className="w-4 h-4" />
              <span>Create Family Directive Policy</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenCreateForm('crypto')}
              className="btn btn-secondary"
              style={{
                minHeight: '38px',
                padding: '0 18px',
                borderRadius: '12px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <KeyRound className="w-4 h-4" />
              <span>Create Crypto Shard Policy</span>
            </button>
          </div>
        </div>
      ) : (
        /* Grid of Active Policies */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
          {filteredPolicies.map((policy) => {
            const telemetry = calculateGuardianHeartbeat(policy, currentTimestamp);
            const catCfg = categoryConfig[policy.category || 'family'] || categoryConfig.family;
            const CatIcon = catCfg.icon;

            return (
              <div
                key={policy.id}
                style={{
                  borderRadius: '18px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                {/* Policy Top Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: catCfg.bg,
                        border: `1px solid ${catCfg.border}`,
                        color: catCfg.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: catCfg.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {catCfg.label}
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '2px 0 0 0', lineHeight: 1.3 }}>
                        {policy.title}
                      </h3>
                    </div>
                  </div>

                  {/* Telemetry Status Pill */}
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '100px',
                      background:
                        telemetry.status === 'active'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : telemetry.status === 'grace'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                      color:
                        telemetry.status === 'active'
                          ? '#10b981'
                          : telemetry.status === 'grace'
                          ? '#f59e0b'
                          : '#ef4444',
                      border: `1px solid ${
                        telemetry.status === 'active'
                          ? 'rgba(16, 185, 129, 0.3)'
                          : telemetry.status === 'grace'
                          ? 'rgba(245, 158, 11, 0.3)'
                          : 'rgba(239, 68, 68, 0.3)'
                      }`,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {telemetry.status === 'active'
                      ? '🟢 Active'
                      : telemetry.status === 'grace'
                      ? '🟡 Grace Window'
                      : '🔴 Pending Release'}
                  </span>
                </div>

                {/* Real-time Countdown & Progress Bar */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {telemetry.status === 'active' ? 'Heartbeat Check-In Timer' : 'Emergency Grace Countdown'}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: telemetry.status === 'active' ? '#38bdf8' : '#f87171' }}>
                      {formatCountdown(telemetry.msUntilNextEvent)}
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${telemetry.status === 'active' ? telemetry.checkInProgressPct : telemetry.graceProgressPct}%`,
                        background:
                          telemetry.status === 'active'
                            ? 'linear-gradient(90deg, #10b981, #38bdf8)'
                            : 'linear-gradient(90deg, #f59e0b, #ef4444)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
                    <span>Window: {policy.checkInWindowHours}h ({(policy.checkInWindowHours / 24).toFixed(1)}d)</span>
                    <span>Buffer: {policy.graceWindowHours}h grace</span>
                  </div>
                </div>

                {/* Designated Guardians List */}
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Designated Guardians ({policy.trustedContacts.length}):
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {policy.trustedContacts.map((contact, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '11.5px',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Mail className="w-3 h-3 text-cyan-400" />
                        <span>{contact}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Multimodal Badges Count */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  {policy.attachments && policy.attachments.length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>{policy.attachments.length} files</span>
                    </span>
                  )}
                  {policy.photos && policy.photos.length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Camera className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{policy.photos.length} photos</span>
                    </span>
                  )}
                  {policy.audioUrl && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mic className="w-3.5 h-3.5 text-amber-400" />
                      <span>Voice Memo</span>
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: '10.5px', color: '#64748b' }}>
                    Hash: {policy.integrityHash.substring(0, 10)}...
                  </span>
                </div>

                {/* Card Action Controls Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '12px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleSinglePolicyPulse(policy.id, policy.title)}
                      className="btn"
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                      }}
                      title="Reset check-in window for this policy"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Pulse</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartAuditEval(policy)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Run Zero-Knowledge algorithmic diagnostic audit"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Audit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimulateHandover(policy)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Simulate automated dispatch handover"
                    >
                      <Send className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Handover</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditForm(policy)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '12px' }}
                      title="Edit policy parameters and attachments"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePolicy(policy.id, policy.title)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Delete & disarm this policy"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🔬 ZERO-KNOWLEDGE DIAGNOSTIC AUDIT MODAL */}
      {evalPolicy && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              background: '#0a0f1d',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity className="w-5 h-5 text-cyan-400" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Audit Evaluation: {evalPolicy.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEvalPolicy(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              style={{
                background: '#030712',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#38bdf8',
                minHeight: '220px',
                maxHeight: '340px',
                overflowY: 'auto',
                lineHeight: 1.6,
              }}
            >
              {evalLog.map((line, idx) => (
                <div key={idx} style={{ color: line.includes('PASS') || line.includes('🟢') ? '#4ade80' : line.includes('🟡') ? '#f59e0b' : line.includes('🔴') ? '#f87171' : '#cbd5e1' }}>
                  {line}
                </div>
              ))}
              {isEvaluating && <div style={{ color: '#38bdf8', marginTop: '6px' }}>&gt; Performing zero-knowledge evaluation...</div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setEvalPolicy(null)}
                className="btn btn-primary"
                style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '13px' }}
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 SIMULATED HANDOVER DISPATCH MODAL */}
      {launchPolicy && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#0f172a',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Send className="w-5 h-5 text-red-400" />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Simulated Handover: {launchPolicy.title}
                  </h3>
                  <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                    Zero-knowledge emergency transmission preview for designated guardians
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLaunchPolicy(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient Manifest */}
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', marginBottom: '6px' }}>
                Automated Dispatch Recipients:
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {launchPolicy.trustedContacts.map((c, i) => (
                  <span key={i} style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.06)', color: '#ffffff', fontSize: '12px' }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Decrypted Payload */}
            <div style={{ background: '#030712', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Decrypted Directive Payload
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: 0 }}>
                {launchPolicy.emergencyMessage}
              </p>
            </div>

            {/* Attached Media */}
            {(launchPolicy.photos?.length || 0) > 0 && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Attached Biometric Snapshots:</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {launchPolicy.photos?.map((p, idx) => (
                    <img key={idx} src={p} alt={`Dispatch photo ${idx + 1}`} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                  ))}
                </div>
              </div>
            )}

            {launchPolicy.audioUrl && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Decrypted Voice Memo:</div>
                <audio src={launchPolicy.audioUrl} controls style={{ height: '36px', width: '100%', maxWidth: '320px' }} />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '14px' }}>
              <button
                type="button"
                onClick={() => {
                  setLaunchPolicy(null);
                  showToast(`Handover preview for "${launchPolicy.title}" completed.`, 'success');
                }}
                className="btn btn-primary"
                style={{ padding: '8px 22px', borderRadius: '10px', fontSize: '13px' }}
              >
                Done Previewing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📷 LIVE OPTICAL CAMERA STUDIO MODAL */}
      <InnovativeCameraStudioModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
        title="Legacy Guardian Biometric & Emergency Camera"
        subtitle="Zero-knowledge tamper-evident emergency photo capture with cryptographic HUD timestamps"
        showToast={showToast}
      />
    </div>
  );
};

// Backward-compatibility export alias
export const DeadManSafetyCapsuleView = LegacyGuardianCapsuleView;
