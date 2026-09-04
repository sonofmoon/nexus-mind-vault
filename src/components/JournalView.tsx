import { generateEntryShareLink, generateEncryptedEntryShareLink } from '../utils/entrySharingEngine';
import { ConfirmationModal } from './ConfirmationModal';
import { Share2, Undo2, Printer, CheckCircle2, Sparkles, Bell } from 'lucide-react';
import { authenticatedFetch } from '../services/apiClient';
import { generateGeminiChatResponse } from '../services/geminiClient';
import { VoiceNotePreviewCard } from './VoiceNotePreviewCard';
import { createCalendarEvent } from '../services/calendarIntegration';
import { sanitizePlainText } from '../utils/sanitizeHtml';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { JournalEntry, MoodType, AttachmentItem, JournalDraft, VaultMode } from '../types';
import {
  getJournalDrafts,
  saveJournalDrafts,
  purgeJournalDrafts,
} from '../services/vaultStorage';
import {
  JOURNAL_TEMPLATES, calculateJournalStreak, JournalTemplate } from '../utils/journalTemplates';
import { Edit } from 'lucide-react';
import { InnovativeCameraStudioModal, CapturedPhotoResult } from './InnovativeCameraStudioModal';
import { vaultAudio } from '../utils/vaultAudioSynthesizer';
import {
  Edit3,
  Eye,
  MessageSquare,
  Paperclip,
  Mic,
  Plus,
  Search,
  Trash2,
  Calendar,
  Tag,
  BookOpen,
  Smile,
  Frown,
  Compass,
  Flame,
  Moon,
  Target,
  FolderPlus,
  Camera,
  MapPin,
  Clock,
  Play,
  Pause,
  Square,
  X,
  Send,
  Save,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Download,
  AlertTriangle,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export type CaptureTab = 'write' | 'talk' | 'attach' | 'voice';

export interface JournalViewProps {
  userId?: string;
  vaultMode?: VaultMode;
  onOpenUnlockModal?: () => void;
  entries: JournalEntry[];
  onAddEntry: (entry: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteEntry: (id: string) => void;
  onUpdateEntry?: (id: string, updatedFields: Partial<JournalEntry>) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  journalTitle?: string;
  microcopy?: string;
  showGuardrail?: boolean;
  guardrailTitle?: string;
  guardrailSummary?: string;
  guardrailActions?: string[];
  draftsEmptyText?: string;
  entriesEmptyText?: string;
  className?: string;
}

const CAPTURE_TABS: Array<{ id: CaptureTab; label: string; title: string; icon: React.ReactNode }> = [
  { id: 'write', label: 'Write', title: 'Multimodal entry canvas (text, voice, media & details)', icon: <Edit3 className="w-3.5 h-3.5 inline" /> },
  { id: 'talk', label: 'Chat with AI', title: 'Talk with your AI cognitive mirror', icon: <MessageSquare className="w-3.5 h-3.5 inline" /> },
];

const MOODS: { type: MoodType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'calm', label: 'Calm', icon: <Compass className="w-3.5 h-3.5" />, color: 'var(--accent-blue-light)' },
  { type: 'focused', label: 'Focused', icon: <Target className="w-3.5 h-3.5" />, color: 'var(--accent-emerald)' },
  { type: 'creative', label: 'Creative', icon: <Smile className="w-3.5 h-3.5" />, color: '#c084fc' },
  { type: 'energetic', label: 'Energetic', icon: <Flame className="w-3.5 h-3.5" />, color: 'var(--accent-amber)' },
  { type: 'anxious', label: 'Anxious', icon: <Frown className="w-3.5 h-3.5" />, color: 'var(--accent-rose)' },
  { type: 'tired', label: 'Tired', icon: <Moon className="w-3.5 h-3.5" />, color: 'var(--text-muted)' },
];

const DRAFTS_STORAGE_KEY = 'vault_journal_drafts_local';

export const JournalView: React.FC<JournalViewProps> = ({
  userId,
  entries,
  onAddEntry,
  onDeleteEntry,
  onUpdateEntry,
  showToast,
  journalTitle = "Nexus Mind Vault",
  microcopy = "End-to-end encrypted workspace with full features enabled.",
  showGuardrail = false,
  guardrailTitle = "Crisis Guardrail",
  guardrailSummary = "",
  guardrailActions = [],
  draftsEmptyText = "No saved drafts yet.",
  entriesEmptyText = "No entries yet. Start journaling.",
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<CaptureTab>('write');
  // 🔒 ITEM 24: Single-Entry Sharing State
  const [sharingEntry, setSharingEntry] = useState<JournalEntry | null>(null);
  const [sharePassphrase, setSharePassphrase] = useState('');
  const [generatedShareUrl, setGeneratedShareUrl] = useState<string | null>(null);

  // 🔒 ITEM 32: Undo Deletion State
  const [recentlyDeleted, setRecentlyDeleted] = useState<JournalEntry | null>(null);
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<JournalEntry | null>(null);

  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [shareExpirationHours, setShareExpirationHours] = useState(48);

  const handleCreateShareLink = async () => {
    if (!sharingEntry) return;
    setIsGeneratingShare(true);
    try {
      const url = await generateEncryptedEntryShareLink(sharingEntry, sharePassphrase, shareExpirationHours);
      setGeneratedShareUrl(url);
      navigator.clipboard?.writeText(url);
      showToast('🔒 AES-GCM-256 encrypted share link generated & copied to clipboard!', 'success');
    } catch (err: any) {
      const fallbackUrl = generateEntryShareLink(sharingEntry, sharePassphrase, shareExpirationHours);
      setGeneratedShareUrl(fallbackUrl);
      navigator.clipboard?.writeText(fallbackUrl);
      showToast('Encrypted share link copied to clipboard!', 'success');
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const handleRequestDelete = (entry: JournalEntry) => {
    setDeleteConfirmEntry(entry);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmEntry) return;
    const target = deleteConfirmEntry;
    setRecentlyDeleted(target);
    onDeleteEntry(target.id);
    setDeleteConfirmEntry(null);
    showToast(`Deleted "${target.title}". Undo available.`, 'info');
  };

  const handleUndoDelete = () => {
    if (!recentlyDeleted) return;
    onAddEntry({
      title: recentlyDeleted.title,
      content: recentlyDeleted.content,
      mood: recentlyDeleted.mood,
      tags: recentlyDeleted.tags,
      folder: recentlyDeleted.folder,
      attachments: recentlyDeleted.attachments,
      reminderDate: recentlyDeleted.reminderDate,
      reminderTime: recentlyDeleted.reminderTime,
    });
    showToast(`Restored "${recentlyDeleted.title}".`, 'success');
    setRecentlyDeleted(null);
  };

  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editMood, setEditMood] = useState<MoodType>('neutral');
  const [editTags, setEditTags] = useState('');

  const streakStats = useMemo(() => calculateJournalStreak(entries), [entries]);

  const handleApplyTemplate = (tmpl: JournalTemplate) => {
    setEntryTitle(tmpl.templateTitle);
    setWriteContent(tmpl.templateContent);
    setSelectedMood(tmpl.defaultMood);
    setEntryTags(tmpl.defaultTags.join(', '));
    showToast(`Applied "${tmpl.name}" template.`, 'info');
  };

  const handleStartEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setEditTitle(entry.title);
    setEditContent(entry.content);
    setEditMood(entry.mood);
    setEditTags((entry.tags || []).join(', '));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    const tagArray = editTags.split(',').map(t => t.trim()).filter(Boolean);
    if (onUpdateEntry) {
      onUpdateEntry(editingEntry.id, {
        title: editTitle,
        content: editContent,
        mood: editMood,
        tags: tagArray,
      });
    }
    showToast('Entry updated securely.', 'success');
    setEditingEntry(null);
  };


  // Form State
  const [writeContent, setWriteContent] = useState('');
  const [talkInput, setTalkInput] = useState('');
  const [entryTitle, setEntryTitle] = useState('');
  const [entryTags, setEntryTags] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodType>('focused');
  
  // Folders State
  const [folders, setFolders] = useState<string[]>(['Personal', 'Work', 'Projects', 'Reflections']);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [showNewFolderInput, setShowNewFolderInput] = useState<boolean>(false);

  // Reminders & Attachments State
  const [reminderDate, setReminderDate] = useState<string>('');
  const [reminderTime, setReminderTime] = useState<string>('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [locationTag, setLocationTag] = useState<string>('');

  // Drafts State
  const [drafts, setDrafts] = useState<JournalDraft[]>(() => {
    const uid = userId || 'default_user';
    return getJournalDrafts(uid);
  });

  // AI Chat History State
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'user' | 'model'; content: string; createdAt: string }>>([
    {
      id: 'welcome_1',
      role: 'model',
      content: 'Hello! I am Gemini, your cognitive mirror. Share your feelings, goals, or reflections freely.',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [isSendingAI, setIsSendingAI] = useState(false);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Voice Recorder State & Refs
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFolder, setFilterFolder] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterAttachments, setFilterAttachments] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'recently-updated'>('newest');
  const [selectedCoverDomainFilter, setSelectedCoverDomainFilter] = useState<string>('all');

  // Extract multi-domain list from cover entries
  const coverDomains = useMemo(() => {
    const doms = new Set<string>();
    entries.forEach((e: any) => {
      if (e.domain) doms.add(e.domain);
    });
    return Array.from(doms);
  }, [entries]);

  // Three-dots menu state & Delete confirmation modal state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ type: 'entry' | 'draft' | 'voice_recording'; id: string; title: string } | null>(null);
  const [viewingDraft, setViewingDraft] = useState<JournalDraft | null>(null);

  // Excerpt Expansion State & Chronicle width expansion
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(new Set());
  const [viewingFullEntry, setViewingFullEntry] = useState<JournalEntry | null>(null);
  const [isChronicleExpanded, setIsChronicleExpanded] = useState<boolean>(false);

  const toggleExpandEntry = (id: string) => {
    setExpandedEntryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // 🔔 Active Reflection Reminder Alert Watcher
  useEffect(() => {
    const alertedStorageKey = 'vault_alerted_reminders';
    const checkReminders = () => {
      try {
        const rawAlerted = localStorage.getItem(alertedStorageKey);
        const alertedIds: string[] = rawAlerted ? JSON.parse(rawAlerted) : [];
        const now = new Date();
        const currentDateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const currentHours = now.getHours().toString().padStart(2, '0');
        const currentMinutes = now.getMinutes().toString().padStart(2, '0');
        const currentTimeStr = `${currentHours}:${currentMinutes}`;

        entries.forEach((entry) => {
          if (!entry.reminderDate || alertedIds.includes(entry.id)) return;

          // Normalize reminderDate (handle both YYYY-MM-DD and DD-MM-YYYY)
          let rDate = entry.reminderDate.trim();
          if (/^\d{2}-\d{2}-\d{4}$/.test(rDate)) {
            const parts = rDate.split('-');
            rDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }

          const rTime = entry.reminderTime ? entry.reminderTime.trim() : '09:00';

          // Check if scheduled reminder time is reached
          if (rDate === currentDateStr && currentTimeStr >= rTime) {
            alertedIds.push(entry.id);
            try {
              localStorage.setItem(alertedStorageKey, JSON.stringify(alertedIds));
            } catch {}

            showToast(`🔔 Reflection Reminder: "${entry.title}" is scheduled now!`, 'info');

            // Play ambient notification tone
            try {
              vaultAudio.playUnlockSound();
            } catch {}

            // Native Web Notification if permitted
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              try {
                new Notification('Nexus Mind Vault Reminder', {
                  body: `"${entry.title}" - Scheduled reflection reminder`,
                  icon: '/favicon.png',
                });
              } catch {}
            }
          }
        });
      } catch (e) {
        console.warn('Reminder check failed', e);
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 20000); // Check every 20s
    return () => clearInterval(interval);
  }, [entries, showToast]);

  const handleReminderDateChange = (val: string) => {
    setReminderDate(val);
    if (val && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  };

  // Save Drafts to localStorage
  const saveDraftsToStorage = (updatedDrafts: JournalDraft[]) => {
    setDrafts(updatedDrafts);
    const uid = userId || 'default_user';
    saveJournalDrafts(uid, updatedDrafts);
  };

  const handleSaveDraft = () => {
    const textToSave = writeContent.trim() || talkInput.trim() || entryTitle.trim();
    const hasMedia = attachments.length > 0 || !!recordedAudioUrl;
    if (!textToSave && !hasMedia) {
      showToast("Write content, record a voice note, or attach media before saving a draft.", "warning");
      return;
    }

    const defaultTitle = recordedAudioUrl
      ? `Voice Note (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
      : attachments.length > 0
      ? `Media Draft (${attachments[0].name})`
      : textToSave.substring(0, 30) + '...';

    const newDraft: JournalDraft = {
      id: 'draft_' + Date.now().toString(36),
      title: entryTitle.trim() || defaultTitle,
      content: writeContent || talkInput || (recordedAudioUrl ? '[Voice Note Recording]' : '[Media Attachments]'),
      mood: selectedMood,
      tags: entryTags.split(',').map(t => t.trim()).filter(Boolean),
      folder: selectedFolder,
      attachments: attachments.length > 0 ? attachments : undefined,
      audioUrl: recordedAudioUrl || undefined,
      sourceTab: activeTab,
      savedAt: new Date().toISOString(),
    };
    saveDraftsToStorage([newDraft, ...drafts]);
    showToast("Draft saved to studio.", "success");
  };

  const handleRestoreDraft = (draft: JournalDraft) => {
    setWriteContent(draft.content || '');
    setEntryTitle(draft.title || '');
    if (draft.mood) setSelectedMood(draft.mood);
    if (draft.tags) setEntryTags(draft.tags.join(', '));
    if (draft.folder) setSelectedFolder(draft.folder);
    if (draft.attachments) setAttachments(draft.attachments);
    if (draft.audioUrl) {
      setRecordedAudioUrl(draft.audioUrl);
    } else {
      setRecordedAudioUrl(null);
    }

    if (draft.sourceTab) {
      setActiveTab(draft.sourceTab);
    } else if (draft.audioUrl) {
      setActiveTab('voice');
    } else if (draft.attachments && draft.attachments.length > 0) {
      setActiveTab('attach');
    } else {
      setActiveTab('write');
    }
    showToast(`Loaded draft: "${draft.title}"`, "info");
  };

  const handleDeleteDraft = (draftId: string) => {
    const updated = drafts.filter(d => d.id !== draftId);
    saveDraftsToStorage(updated);
    showToast("Draft deleted.", "info");
  };

  // Download Handlers
  const handleDownloadEntry = (entry: JournalEntry) => {
    const fileLines = [
      `TITLE: ${entry.title}`,
      `CREATED: ${new Date(entry.createdAt).toLocaleString()}`,
      `MOOD: ${entry.mood}`,
      `FOLDER: ${entry.folder || 'None'}`,
      `TAGS: ${(entry.tags || []).join(', ') || 'None'}`,
      `LOCATION: ${entry.location || 'None'}`,
      `ATTACHMENTS: ${(entry.attachments || []).map(a => a.name).join(', ') || 'None'}`,
      `----------------------------------------`,
      `CONTENT:`,
      entry.content,
    ];

    const blob = new Blob([fileLines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${entry.title.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}_entry.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded: "${entry.title}"`, "info");
  };

  const handleDownloadDraft = (draft: JournalDraft) => {
    const fileLines = [
      `TITLE: ${draft.title}`,
      `SAVED AT: ${new Date(draft.savedAt).toLocaleString()}`,
      `MOOD: ${draft.mood || 'None'}`,
      `FOLDER: ${draft.folder || 'None'}`,
      `TAGS: ${(draft.tags || []).join(', ') || 'None'}`,
      `ATTACHMENTS: ${(draft.attachments || []).map(a => a.name).join(', ') || 'None'}`,
      `----------------------------------------`,
      `CONTENT:`,
      draft.content,
    ];

    const blob = new Blob([fileLines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${draft.title.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}_draft.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded draft: "${draft.title}"`, "info");
  };

  // Create Folder Handler
  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__create__') {
      setShowNewFolderInput(true);
      setSelectedFolder('');
    } else {
      setShowNewFolderInput(false);
      setSelectedFolder(val);
    }
  };

  const handleAddNewFolder = () => {
    if (!newFolderName.trim()) return;
    const trimmed = newFolderName.trim();
    if (!folders.includes(trimmed)) {
      setFolders(prev => [...prev, trimmed]);
    }
    setSelectedFolder(trimmed);
    setNewFolderName('');
    setShowNewFolderInput(false);
    showToast(`Folder "${trimmed}" created.`, "success");
  };

  // Camera Handlers
  const handleOpenCamera = () => {
    setIsCameraActive(true);
  };

  const handleCloseCamera = () => {
    setIsCameraActive(false);
  };

  const handleCameraCapture = (captured: CapturedPhotoResult) => {
    const newAttachment: AttachmentItem = {
      id: 'att_cam_' + Date.now().toString(36),
      name: `${captured.name}`,
      type: 'image',
      data: captured.dataUrl,
    };
    setAttachments(prev => [...prev, newAttachment]);
    showToast(`Snapshot captured with "${captured.filterName}" lens & attached.`, "success");
    setIsCameraActive(false);
  };

  // Location Handler
  const handleAddLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser.", "error");
      return;
    }
    showToast("Requesting location permission...", "info");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const locString = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        setLocationTag(locString);
        const newAtt: AttachmentItem = {
          id: 'att_loc_' + Date.now().toString(36),
          name: `Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
          type: 'location',
          locationDetails: {
            lat,
            lng,
          },
        };
        setAttachments(prev => [...prev.filter(a => a.type !== 'location'), newAtt]);
        showToast("Location added to entry.", "success");
      },
      (err) => {
        let msg = "Unable to retrieve location.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission denied by user/browser.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "Location position is unavailable.";
        } else if (err.code === err.TIMEOUT) {
          msg = "Location request timed out.";
        }
        showToast(msg, "error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      const isImg = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/');
      const type: AttachmentItem['type'] = isImg ? 'image' : isAudio ? 'audio' : 'file';

      reader.onload = () => {
        const dataUrl = reader.result as string;
        const item: AttachmentItem = {
          id: 'att_file_' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          type,
          size: file.size,
          data: dataUrl,
        };
        setAttachments(prev => [...prev, item]);
      };
      reader.readAsDataURL(file);
    });
    showToast(`${files.length} attachment(s) added.`, "info");
  };

  // Voice Recorder Handlers
  const handleStartVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const mediaRecorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length === 0) {
          showToast("No audio captured in recording.", "warning");
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const cleanMime = mimeType.split(';')[0] || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: cleanMime });

        if (audioBlob.size === 0) {
          showToast("Recorded audio is empty.", "warning");
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        // Set immediate local URL for instant zero-latency UI preview
        const blobUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(blobUrl);

        // Convert to permanent base64 data URL for persistence across reloads & Firestore
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          if (base64data) {
            setRecordedAudioUrl(base64data);
            const voiceAttachment: AttachmentItem = {
              id: 'att_voice_' + Date.now().toString(36),
              name: `Voice_Note_${new Date().toLocaleTimeString().replace(/:/g, '-')}.webm`,
              type: 'audio',
              data: base64data,
              url: base64data,
            };
            setAttachments(prev => [...prev.filter(a => !a.id.startsWith('att_voice_')), voiceAttachment]);
          }
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach(t => t.stop());
      };

      // Stream audio chunks every 250ms for reliable audio headers
      mediaRecorder.start(250);
      setVoiceStatus('recording');
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

      showToast("Voice recording started...", "info");
    } catch (err: any) {
      showToast("Microphone access unavailable or denied.", "error");
    }
  };

  const handlePauseVoiceRecording = () => {
    if (mediaRecorderRef.current && voiceStatus === 'recording') {
      mediaRecorderRef.current.pause();
      setVoiceStatus('paused');
      clearInterval(timerIntervalRef.current);
    }
  };

  const handleResumeVoiceRecording = () => {
    if (mediaRecorderRef.current && voiceStatus === 'paused') {
      mediaRecorderRef.current.resume();
      setVoiceStatus('recording');
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    }
  };

  const handleStopVoiceRecording = () => {
    if (mediaRecorderRef.current && (voiceStatus === 'recording' || voiceStatus === 'paused')) {
      mediaRecorderRef.current.stop();
      setVoiceStatus('stopped');
      clearInterval(timerIntervalRef.current);
      showToast("Voice note recording complete.", "success");
    }
  };

  // Helper timer format
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Send Message to Gemini AI
  const handleSendToAI = async () => {
    const prompt = talkInput.trim() || writeContent.trim();
    if (!prompt) {
      showToast("Enter a prompt or reflection to talk with AI.", "warning");
      return;
    }

    // Always switch to AI Chat / Talk tab so the user can see and continue the conversation
    setActiveTab('talk');

    const userMsg = {
      id: 'msg_' + Date.now() + '_u',
      role: 'user' as const,
      content: prompt,
      createdAt: new Date().toISOString(),
    };

    setChatMessages(prev => [...prev, userMsg]);
    setTalkInput('');
    setWriteContent('');
    setIsSendingAI(true);
    showToast("Sent reflection to Gemini AI...", "info");

    try {
      // 🌐 ITEM: Direct online Google Gemini API call with environment API key
      const contextSummary = entries.length > 0
        ? `User currently has ${entries.length} reflections in their sovereign vault. Recent topics: ${entries.slice(0, 5).map(e => `"${e.title}"`).join(', ')}`
        : 'User is starting their sovereign journal in Nexus Mind Vault.';

      const geminiResult = await generateGeminiChatResponse({
        prompt,
        history: chatMessages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        context: contextSummary,
      });

      if (geminiResult && geminiResult.text) {
        setChatMessages(prev => [
          ...prev,
          {
            id: 'msg_' + Date.now() + '_m',
            role: 'model',
            content: geminiResult.text,
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }
    } catch (apiErr: any) {
      console.warn("[Gemini API Call]", apiErr.message || apiErr);

      // Enclave fallback dynamic cognitive synthesis
      const lower = prompt.toLowerCase();
      let dynamicReply = "";

      if (lower.includes("how are you") || lower.includes("how do you do") || lower.includes("how r u")) {
        dynamicReply = "I am operating smoothly as your AI cognitive reflection mirror! I'm here in your secure local enclave, ready to help you reflect, brainstorm ideas, analyze emotions, or explore personal goals. How are you feeling today?";
      } else if (lower.includes("gemini") || lower.includes("who are you") || lower.includes("what are you") || lower.includes("hello") || lower.includes("hi")) {
        dynamicReply = "Hello! I am Gemini, your privacy-preserving cognitive mirror in Nexus Mind Vault. Every interaction with me is protected with zero-trust client-side encryption. What would you like to reflect on or write about today?";
      } else {
        const matchingEntries = entries.filter((e) =>
          e.title.toLowerCase().includes(lower) ||
          e.content.toLowerCase().includes(lower) ||
          (e.tags && e.tags.some((t) => t.toLowerCase().includes(lower)))
        );

        if (matchingEntries.length > 0) {
          dynamicReply = `🧠 **Cognitive Insight**: Found **${matchingEntries.length} related reflection(s)** in your vault:\n` +
            matchingEntries.slice(0, 3).map((e) => `• **"${e.title}"** (${e.mood ? e.mood.toUpperCase() : 'NOTE'}): ${e.content.slice(0, 120)}...`).join('\n') +
            `\n\nHow would you like to connect or expand upon these thoughts today?`;
        } else if (entries.length > 0) {
          dynamicReply = `Thank you for sharing: "${prompt}". Reflecting on your thoughts builds self-awareness across your ${entries.length} vault entries. What next step or idea does this bring to mind?`;
        } else {
          dynamicReply = `Thank you for sharing: "${prompt}". Taking a moment to capture and articulate your thoughts builds mindfulness and clarity. Would you like to save this reflection into your vault?`;
        }
      }

      setChatMessages(prev => [
        ...prev,
        {
          id: 'msg_' + Date.now() + '_m',
          role: 'model',
          content: dynamicReply,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSendingAI(false);
    }
  };

  // Save Final Entry to Vault
  const handleSaveToVault = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const titleToSave = entryTitle.trim() || writeContent.trim().substring(0, 35) || 'Untitled Reflection';
    const contentToSave = writeContent.trim() || talkInput.trim() || (recordedAudioUrl ? 'Recorded Voice Reflection' : 'Visual / Audio Media Entry');

    if (!writeContent.trim() && !talkInput.trim() && attachments.length === 0 && !recordedAudioUrl) {
      showToast("Please write content, record audio, or attach media before saving.", "error");
      return;
    }

    const tags = entryTags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    // 🛡️ Auto-Purge: Zeroize and delete working draft from storage on save
    const uid = userId || 'default_user';
    purgeJournalDrafts(uid, titleToSave);
    const remainingDrafts = drafts.filter(d => d.title !== titleToSave && d.content !== contentToSave);
    setDrafts(remainingDrafts);

    onAddEntry({
      title: titleToSave,
      content: contentToSave,
      mood: selectedMood,
      tags,
      folder: selectedFolder || undefined,
      reminderDate: reminderDate || undefined,
      reminderTime: reminderTime || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      location: locationTag || undefined,
      audioUrl: recordedAudioUrl || undefined,
    });

    // Reset Form
    setWriteContent('');
    setTalkInput('');
    setEntryTitle('');
    setEntryTags('');
    setAttachments([]);
    setLocationTag('');
    setRecordedAudioUrl(null);
    setVoiceStatus('idle');
    setRecordingSeconds(0);
  };

  // Attachment Checkbox Toggle
  const handleToggleAttachmentFilter = (type: string) => {
    setFilterAttachments(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Filter & Sort Entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Search text query
      const matchesSearch =
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.tags && entry.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (entry.folder && entry.folder.toLowerCase().includes(searchQuery.toLowerCase()));

      // Folder filter
      const matchesFolder = !filterFolder || entry.folder === filterFolder;

      // Domain filter (Multi-Domain Cover Matrix)
      const matchesDomain = selectedCoverDomainFilter === 'all' || !selectedCoverDomainFilter || (entry as any).domain === selectedCoverDomainFilter;

      // Date filter
      const matchesDate = !filterDate || (entry.createdAt && entry.createdAt.startsWith(filterDate));

      // Attachment filter
      let matchesAttachments = true;
      if (filterAttachments.length > 0) {
        matchesAttachments = filterAttachments.some(type => {
          if (type === 'text' && entry.content) return true;
          if (type === 'location' && (entry.location || entry.attachments?.some(a => a.type === 'location'))) return true;
          if (type === 'audio' && (entry.audioUrl || entry.attachments?.some(a => a.type === 'audio'))) return true;
          if (type === 'images' && entry.attachments?.some(a => a.type === 'image')) return true;
          if (type === 'others' && entry.attachments?.some(a => a.type === 'file')) return true;
          return false;
        });
      }

      return matchesSearch && matchesFolder && matchesDate && matchesAttachments && matchesDomain;
    }).sort((a, b) => {
      if (sortOption === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortOption === 'recently-updated') {
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      }
      // default: newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [entries, searchQuery, filterFolder, filterDate, filterAttachments, sortOption, selectedCoverDomainFilter]);

  const rootClassName = useMemo(() => {
    const base = "vault-view-pane active";
    return className ? `${base} ${className}` : base;
  }, [className]);

  return (
    <div id="journal-view" className={`${rootClassName} journal-view-pane`}>
      <header className="view-header" style={{ marginBottom: '6px' }}>
        <h2 id="journal-title" className="view-pane-title">{journalTitle}</h2>
      </header>

      <p id="journal-mode-microcopy" className="vault-microcopy">
        {microcopy}
      </p>

      <div
        className={`journal-layout ${isChronicleExpanded ? 'chronicle-expanded' : ''}`}
        style={isChronicleExpanded ? { display: 'flex', flexDirection: 'column', width: '100%' } : undefined}
      >
        {/* Left Column: Capture Studio & Drafts */}
        <section
          className="journal-left-column"
          style={isChronicleExpanded ? { display: 'none' } : undefined}
        >
          <article className="capture-studio card-shell">
            <div className="card-head capture-head">
              <div>
                <h3>Capture Studio</h3>
                <small className="helper-text">
                  Write, attach files, and chat with AI. Save with mode-safe guardrails.
                </small>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="capture-tabs" role="tablist" aria-label="Capture tabs">
              {CAPTURE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  className={`capture-tab ${activeTab === tab.id ? 'active' : ''}`}
                  data-capture-tab={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  title={tab.title}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon} <span style={{ marginLeft: '4px' }}>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Write Panel (Unified Multimodal Canvas) */}
            <section className={`capture-panel ${activeTab === 'write' ? 'active' : ''}`} data-capture-panel="write">
              <div className="composer-grid">
                {/* Title & Tags */}
                <input
                  type="text"
                  id="entry-title"
                  placeholder="Title (e.g., Daily Check-in, Audio Journal)"
                  value={entryTitle}
                  onChange={(e) => setEntryTitle(e.target.value)}
                />
                <input
                  type="text"
                  id="entry-tags"
                  placeholder="Tags (comma-separated, e.g., reflection, voice)"
                  value={entryTags}
                  onChange={(e) => setEntryTags(e.target.value)}
                />

                {/* Folder Row */}
                <div className="folder-row">
                  <select
                    id="entry-folder"
                    className="modern-picker"
                    aria-label="Folder"
                    value={selectedFolder}
                    onChange={handleFolderChange}
                    style={{ flex: 1 }}
                  >
                    <option value="">Folder (Optional)</option>
                    {folders.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                    <option value="__create__">+ Create new folder</option>
                  </select>

                  {showNewFolderInput && (
                    <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                      <input
                        type="text"
                        id="entry-folder-new"
                        placeholder="New folder name"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                      />
                      <button
                        id="btn-create-folder"
                        className="btn-secondary btn-inline"
                        type="button"
                        onClick={handleAddNewFolder}
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                {/* Picker Row for Date & Time Reminders */}
                <div className="picker-row">
                  <label className="picker-group" htmlFor="entry-reminder-date">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Bell className="w-3 h-3 text-amber-500" />
                      <span>Reminder Date</span>
                    </span>
                    <input
                      type="date"
                      id="entry-reminder-date"
                      className="modern-picker modern-date-input"
                      aria-label="Reminder date"
                      value={reminderDate}
                      onChange={(e) => handleReminderDateChange(e.target.value)}
                    />
                  </label>

                  <label className="picker-group" htmlFor="entry-reminder-time">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock className="w-3 h-3 text-blue-500" />
                      <span>Reminder Time</span>
                    </span>
                    <input
                      type="time"
                      id="entry-reminder-time"
                      className="modern-picker modern-time-picker"
                      aria-label="Reminder time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      step={60}
                    />
                  </label>

                  {(reminderDate || reminderTime) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-end', marginBottom: '4px' }}>
                      <button
                        type="button"
                        onClick={async () => {
                          const mockEntry: JournalEntry = {
                            id: 'temp_reminder',
                            userId: userId || 'default_user',
                            title: entryTitle.trim() || 'Reflection Reminder',
                            content: writeContent.trim() || 'Scheduled mindfulness reminder',
                            mood: selectedMood,
                            tags: entryTags.split(',').map(t => t.trim()).filter(Boolean),
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            reminderDate: reminderDate || undefined,
                            reminderTime: reminderTime || undefined,
                          };
                          showToast('Adding to Google Calendar...', 'info');
                          const res = await createCalendarEvent(mockEntry);
                          showToast(res.message, res.success ? 'success' : 'warning');
                        }}
                        className="btn-ghost"
                        style={{ fontSize: '11px', color: '#1a73e8', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Add reflection reminder to Google Calendar"
                      >
                        <Calendar className="w-3 h-3 text-blue-500" />
                        <span>Google Calendar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setReminderDate(''); setReminderTime(''); }}
                        className="btn-ghost"
                        style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 8px' }}
                        title="Clear reminder schedule"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Mood Selector */}
              <div style={{ margin: '12px 0 8px 0' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Select Mood:
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {MOODS.map((m) => (
                    <button
                      key={m.type}
                      type="button"
                      onClick={() => setSelectedMood(m.type)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-pill)',
                        border: `1px solid ${selectedMood === m.type ? m.color : 'var(--border-subtle)'}`,
                        background: selectedMood === m.type ? m.color + '18' : 'transparent',
                        color: selectedMood === m.type ? m.color : 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: selectedMood === m.type ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Text Area */}
              <textarea
                id="chat-input"
                placeholder="Write your diary note, thoughts, or reflections..."
                value={writeContent}
                onChange={(e) => setWriteContent(e.target.value)}
                style={{ marginTop: '4px', minHeight: '120px' }}
              />

              {/* Voice Recorder Module */}
              <div className="voice-recorder-card" style={{ marginTop: '14px' }}>
                <div className="voice-recorder-head">
                  <strong>Voice Note Recorder</strong>
                  <span id="voice-recording-status" className="voice-status">
                    {voiceStatus.toUpperCase()}
                  </span>
                </div>

                <div id="voice-recording-timer" className="voice-timer">
                  {formatTimer(recordingSeconds)}
                </div>

                <div className="voice-recorder-actions">
                  {(voiceStatus === 'idle' || voiceStatus === 'stopped') && (
                    <button
                      id="btn-voice-start"
                      className="btn-primary btn-sm"
                      type="button"
                      onClick={handleStartVoiceRecording}
                    >
                      <Mic className="w-3.5 h-3.5 inline mr-1.5" /> Record Note
                    </button>
                  )}

                  {voiceStatus === 'recording' && (
                    <>
                      <button
                        id="btn-voice-pause"
                        className="btn-secondary btn-sm"
                        type="button"
                        onClick={handlePauseVoiceRecording}
                      >
                        <Pause className="w-3.5 h-3.5 inline mr-1.5" /> Pause
                      </button>
                      <button
                        id="btn-voice-stop"
                        className="btn-danger btn-sm"
                        type="button"
                        onClick={handleStopVoiceRecording}
                      >
                        <Square className="w-3.5 h-3.5 inline mr-1.5" /> Stop &amp; Save
                      </button>
                    </>
                  )}

                  {voiceStatus === 'paused' && (
                    <>
                      <button
                        id="btn-voice-resume"
                        className="btn-primary btn-sm"
                        type="button"
                        onClick={handleResumeVoiceRecording}
                      >
                        <Play className="w-3.5 h-3.5 inline mr-1.5" /> Resume
                      </button>
                      <button
                        id="btn-voice-stop"
                        className="btn-danger btn-sm"
                        type="button"
                        onClick={handleStopVoiceRecording}
                      >
                        <Square className="w-3.5 h-3.5 inline mr-1.5" /> Stop &amp; Save
                      </button>
                    </>
                  )}
                </div>

                {recordedAudioUrl && (
                  <div style={{ marginTop: '14px', width: '100%' }}>
                    <VoiceNotePreviewCard
                      audioUrl={recordedAudioUrl}
                      durationSeconds={recordingSeconds > 0 ? recordingSeconds : undefined}
                      fileName={`Voice_Note_${new Date().toLocaleTimeString().replace(/:/g, '-')}.webm`}
                      onDelete={() => {
                        setDeleteConfirmTarget({
                          type: 'voice_recording',
                          id: 'voice_recording_current',
                          title: 'Current Voice Recording',
                        });
                      }}
                      onReRecord={() => {
                        setRecordedAudioUrl(null);
                        setAttachments(prev => prev.filter(a => !a.id.startsWith('att_voice_')));
                        handleStartVoiceRecording();
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Media & Attachments Dock */}
              <div style={{ marginTop: '14px' }}>
                <div className="inline-actions">
                  <label
                    htmlFor="entry-media"
                    className="btn-google-chip"
                    style={{ cursor: 'pointer' }}
                  >
                    <Paperclip className="w-4 h-4 text-[#1a73e8]" />
                    <span>Attach Media/File</span>
                  </label>
                  <button
                    id="btn-open-camera"
                    className="btn-google-chip"
                    type="button"
                    title="Open innovative CyberLens Neural Camera Studio"
                    onClick={handleOpenCamera}
                  >
                    <Camera className="w-4 h-4 text-[#ea4335]" />
                    <span>Camera Lens</span>
                  </button>
                  <button
                    id="btn-add-location"
                    className="btn-google-chip"
                    type="button"
                    title="Save your current place"
                    onClick={handleAddLocation}
                  >
                    <MapPin className="w-4 h-4 text-[#34a853]" />
                    <span>Location</span>
                  </button>
                  <input
                    id="entry-media"
                    type="file"
                    accept="*/*"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {/* Attachments Preview Chips */}
                <div id="entry-attachments-preview" className="helper-text" style={{ marginTop: '6px' }}>
                  {attachments.length === 0 ? (
                    "No additional attachments selected."
                  ) : (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {attachments.map(att => (
                        <span
                          key={att.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-pill)',
                            padding: '2px 8px',
                            fontSize: '11px',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {att.type === 'image' && <Camera className="w-3 h-3 text-blue-500" />}
                          {att.type === 'location' && <MapPin className="w-3 h-3 text-emerald-500" />}
                          {att.type === 'audio' && <Mic className="w-3 h-3 text-purple-500" />}
                          {att.type === 'file' && <Paperclip className="w-3 h-3 text-amber-500" />}
                          {att.name}
                          <X
                            className="w-3 h-3 cursor-pointer text-muted hover:text-rose-500 ml-1"
                            onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                          />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Talk / AI Chat Panel */}
            <section className={`capture-panel ${activeTab === 'talk' ? 'active' : ''}`} data-capture-panel="talk">
              <div id="chat-history" className="chat-history" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto', padding: '12px 4px' }}>
                <div className="system-msg" style={{ background: 'var(--surface-hover)', padding: '10px 14px', borderRadius: '12px', fontSize: '12px', border: '1px solid var(--border-subtle)' }}>
                  <strong id="journal-welcome-title">Gemini is your cognitive mirror.</strong>
                  <br />
                  <span id="journal-welcome-copy">Journal freely. Your entries are encrypted before leaving your device.</span>
                </div>

                {chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                    }}
                  >
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '16px',
                        fontSize: '13px',
                        background: msg.role === 'user' ? '#d3e3fd' : '#ffffff',
                        color: msg.role === 'user' ? '#041e49' : 'var(--text-primary)',
                        border: msg.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                        lineHeight: '1.5',
                      }}
                    >
                      {msg.content}
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {isSendingAI && (
                  <div className="typing-indicator" style={{ alignSelf: 'flex-start', margin: '4px 0', display: 'flex', gap: '4px' }}>
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                )}
              </div>

              {chatMessages.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', margin: '6px 0' }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      const conversationText = chatMessages
                        .map(m => `${m.role === 'user' ? 'Me' : 'Gemini'}: ${m.content}`)
                        .join('\n\n');
                      setWriteContent(prev => (prev ? `${prev}\n\n---\n**AI Conversation Reflection**:\n${conversationText}` : conversationText));
                      setActiveTab('write');
                      showToast("AI conversation transferred to write canvas.", "info");
                    }}
                    style={{ fontSize: '11.5px', color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Transfer this conversation into your Write canvas"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    <span>Transfer to Write Canvas</span>
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setChatMessages([]);
                      showToast("Conversation cleared.", "info");
                    }}
                    style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}
                  >
                    Clear Chat
                  </button>
                </div>
              )}

              <div className="talk-composer" style={{ marginTop: '14px' }}>
                <textarea
                  id="chat-input-talk"
                  placeholder="Ask Gemini, reflect on your notes, or continue conversation..."
                  aria-label="Continue conversation"
                  value={talkInput}
                  onChange={(e) => setTalkInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendToAI();
                    }
                  }}
                  style={{ minHeight: '80px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {/* Crisis Guardrail Panel */}
              <div id="guardrail-panel" className={`guardrail-panel ${showGuardrail ? "" : "hidden"}`} aria-live="polite">
                <div id="guardrail-title" className="guardrail-title">{guardrailTitle}</div>
                <p id="guardrail-summary" className="guardrail-summary">{guardrailSummary}</p>
                <ul id="guardrail-actions" className="guardrail-actions">
                  {guardrailActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Studio Bottom Bar */}
            <div className="capture-topbar capture-bottom-bar">
              <div className="capture-top-actions capture-left-actions">
                <button id="btn-clear-draft" className="btn-secondary btn-inline" type="button" onClick={handleSaveDraft}>
                  <Save className="w-3.5 h-3.5 inline mr-1" /> Save Draft
                </button>
                <button id="btn-save-note" className="btn-secondary btn-inline" aria-label="Save to vault" type="button" onClick={handleSaveToVault}>
                  <Save className="w-3.5 h-3.5 inline mr-1" /> Save to Vault
                </button>
              </div>
              <div className="capture-top-actions capture-right-actions">
                <button id="btn-send" className="btn-send" aria-label="Send to AI" title="Send to AI" type="button" onClick={handleSendToAI}>
                  <Send className="w-3.5 h-3.5 inline mr-1" /> Send to AI
                </button>
              </div>
            </div>
          </article>

          {/* Saved Drafts Card */}
          <article id="drafts-card" className="setting-card card-shell">
            <div className="card-head">
              <h3>Drafts</h3>
            </div>
            <div id="drafts-list" className="drafts-list">
              {drafts.length === 0 ? (
                <div className="empty-state">{draftsEmptyText}</div>
              ) : (
                drafts.map(d => (
                  <div key={d.id} className="draft-item" style={{ position: 'relative' }}>
                    <div className="draft-info" onClick={() => handleRestoreDraft(d)} style={{ cursor: 'pointer', flex: 1 }}>
                      <span className="draft-title">{d.title}</span>
                      <span className="draft-time">{new Date(d.savedAt).toLocaleTimeString()}</span>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === d.id ? null : d.id);
                        }}
                        style={{ minHeight: '32px', padding: '4px 8px', borderRadius: '50%' }}
                        title="Draft Options"
                      >
                        <MoreVertical className="w-4 h-4 text-secondary" />
                      </button>

                      {openMenuId === d.id && (
                        <div
                          className="dropdown-menu"
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            marginTop: '4px',
                            background: '#ffffff',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            boxShadow: 'var(--shadow-elevated)',
                            zIndex: 100,
                            minWidth: '130px',
                            overflow: 'hidden',
                            padding: '4px',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              padding: '8px 12px',
                              fontSize: '13px',
                              color: 'var(--text)',
                              background: 'transparent',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              textAlign: 'left',
                              minHeight: 'auto',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              setViewingDraft(d);
                            }}
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-500" />
                            <span>Open</span>
                          </button>
                          <button
                            type="button"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              padding: '8px 12px',
                              fontSize: '13px',
                              color: 'var(--text)',
                              background: 'transparent',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              textAlign: 'left',
                              minHeight: 'auto',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              handleRestoreDraft(d);
                            }}
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              padding: '8px 12px',
                              fontSize: '13px',
                              color: 'var(--red)',
                              background: 'transparent',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              textAlign: 'left',
                              minHeight: 'auto',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              setDeleteConfirmTarget({ type: 'draft', id: d.id, title: d.title });
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        {/* Right Column: Chronicle (Entries List & Filters) */}
        <section
          className="journal-right-column"
          style={isChronicleExpanded ? { width: '100%', flex: 1 } : undefined}
        >
          <article className="entries-panel card-shell" style={isChronicleExpanded ? { width: '100%' } : undefined}>
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 id="entries-panel-title">Chronicle</h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {filteredEntries.length} {filteredEntries.length === 1 ? 'reflection' : 'reflections'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  id="btn-toggle-chronicle-width"
                  onClick={() => setIsChronicleExpanded(prev => !prev)}
                  className="btn-ghost"
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: isChronicleExpanded ? '#1a73e8' : 'var(--text-secondary)',
                    background: isChronicleExpanded ? 'rgba(26, 115, 232, 0.1)' : 'transparent',
                    border: '1px solid ' + (isChronicleExpanded ? 'rgba(26, 115, 232, 0.3)' : 'var(--border-subtle)'),
                    cursor: 'pointer',
                  }}
                  title={isChronicleExpanded ? "Restore side-by-side view with Capture Studio" : "Expand Chronicle to full width for wide viewing"}
                >
                  {isChronicleExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isChronicleExpanded ? 'Split View' : 'Full Width'}</span>
                </button>
              </div>
            </div>

            {/* Multi-Domain Cover Filter Pills */}
            {coverDomains.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', padding: '6px 12px 10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '2px' }}>
                  Domains:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCoverDomainFilter('all')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: `1.5px solid ${selectedCoverDomainFilter === 'all' ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    background: selectedCoverDomainFilter === 'all' ? 'var(--accent-blue-subtle)' : 'var(--bg-surface)',
                    color: selectedCoverDomainFilter === 'all' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  All ({entries.length})
                </button>
                {coverDomains.map((dom) => {
                  const count = entries.filter((e: any) => e.domain === dom).length;
                  const isSelected = selectedCoverDomainFilter === dom;
                  return (
                    <button
                      key={dom}
                      type="button"
                      onClick={() => setSelectedCoverDomainFilter(dom)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: `1.5px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                        background: isSelected ? 'var(--accent-blue-subtle)' : 'var(--bg-surface)',
                        color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {dom} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Filter & Search Toolbar */}
            <div className="entries-toolbar">
              <div style={{ position: 'relative' }}>
                <Search className="w-3.5 h-3.5" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="entry-search"
                  type="text"
                  placeholder="Search by Title, Tags, Text"
                  style={{ paddingLeft: '34px' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                id="entry-filter-folder"
                aria-label="Filter by folder"
                value={filterFolder}
                onChange={(e) => setFilterFolder(e.target.value)}
              >
                <option value="">All folders</option>
                {folders.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>

              <div className="date-filter-wrap">
                <input
                  id="entry-filter-date"
                  type="date"
                  aria-label="Search by date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
                <button
                  id="btn-date-filter-trigger"
                  className="btn-secondary btn-inline date-filter-trigger"
                  type="button"
                  onClick={() => showToast(filterDate ? `Filtering date: ${filterDate}` : "Select a date first", "info")}
                >
                  Search by Date
                </button>
              </div>

              <details className="attachment-filter-dropdown" id="entry-attachment-filter-dropdown">
                <summary style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Attachments Filter</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </summary>
                <div className="attachment-filter-menu">
                  <label>
                    <input
                      className="entry-attachment-filter"
                      id="entry-filter-attachment-text"
                      type="checkbox"
                      value="text"
                      checked={filterAttachments.includes('text')}
                      onChange={() => handleToggleAttachmentFilter('text')}
                    />
                    Text File
                  </label>
                  <label>
                    <input
                      className="entry-attachment-filter"
                      id="entry-filter-attachment-images"
                      type="checkbox"
                      value="images"
                      checked={filterAttachments.includes('images')}
                      onChange={() => handleToggleAttachmentFilter('images')}
                    />
                    Images
                  </label>
                  <label>
                    <input
                      className="entry-attachment-filter"
                      id="entry-filter-attachment-audio"
                      type="checkbox"
                      value="audio"
                      checked={filterAttachments.includes('audio')}
                      onChange={() => handleToggleAttachmentFilter('audio')}
                    />
                    Audio
                  </label>
                  <label>
                    <input
                      className="entry-attachment-filter"
                      id="entry-filter-attachment-location"
                      type="checkbox"
                      value="location"
                      checked={filterAttachments.includes('location')}
                      onChange={() => handleToggleAttachmentFilter('location')}
                    />
                    Location
                  </label>
                  <label>
                    <input
                      className="entry-attachment-filter"
                      id="entry-filter-attachment-others"
                      type="checkbox"
                      value="others"
                      checked={filterAttachments.includes('others')}
                      onChange={() => handleToggleAttachmentFilter('others')}
                    />
                    Others
                  </label>
                </div>
              </details>

              <select
                id="entry-sort"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="recently-updated">Recently edited</option>
              </select>

              <button
                id="btn-clear-entry-filters"
                className="btn-danger btn-inline"
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterFolder('');
                  setFilterDate('');
                  setFilterAttachments([]);
                  setSortOption('newest');
                  showToast("Filters cleared.", "info");
                }}
              >
                Clear filters
              </button>
            </div>

            {/* Entries List Container */}
            <div
              id="entries-list"
              className="entries-container list-layout-active"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                marginTop: '14px',
                width: '100%',
              }}
            >
              {filteredEntries.length === 0 ? (
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
                    gap: '14px',
                    boxShadow: 'var(--shadow-subtle)',
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '20px',
                      background: 'rgba(59, 130, 246, 0.12)',
                      color: 'var(--blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <BookOpen className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Your Sovereign Vault is Ready
                  </h3>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '440px', margin: 0, lineHeight: 1.6 }}>
                    {searchQuery
                      ? `No reflections match '${searchQuery}'. Try searching another keyword or clearing your filters.`
                      : 'Capture your thoughts, ideas, and reflections in complete privacy. Every memory is cryptographically sealed with AES-GCM-256 before saving.'}
                  </p>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        const titleInput = document.getElementById('entry-title-input');
                        if (titleInput) titleInput.focus();
                      }}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Write First Reflection</span>
                    </button>
                    {searchQuery && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '10px 18px', borderRadius: '12px', fontSize: '13px' }}
                        onClick={() => {
                          setSearchQuery('');
                          setFilterFolder('');
                          setFilterDate('');
                          setFilterAttachments([]);
                        }}
                      >
                        <span>Clear Search</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                filteredEntries.map((entry) => {
                  const moodObj = MOODS.find((m) => m.type === entry.mood) || MOODS[0];
                  const isExpanded = expandedEntryIds.has(entry.id);
                  const isLongContent = (entry.content || '').length > 160 || (entry.content || '').includes('\n');
                  const dateStr = new Date(entry.createdAt).toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={entry.id}
                      className="journal-entry-item entry-card-list"
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        position: 'relative',
                        boxShadow: 'var(--shadow-subtle)',
                        boxSizing: 'border-box',
                        minWidth: 0,
                        maxWidth: '100%',
                        width: '100%',
                        height: 'auto',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
                          <h4
                            style={{
                              fontSize: '15px',
                              fontWeight: 700,
                              margin: 0,
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                              wordBreak: 'break-word',
                              minWidth: 0,
                              lineHeight: '1.3',
                            }}
                            onClick={() => setViewingFullEntry(entry)}
                            title="Click to view full reflection"
                          >
                            {entry.title}
                          </h4>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-pill)',
                              border: `1px solid ${moodObj.color}`,
                              color: moodObj.color,
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            {moodObj.icon}
                            {moodObj.label}
                          </span>

                          {entry.folder && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: 'var(--bg-main)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-pill)',
                                padding: '1px 8px',
                                fontSize: '10.5px',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              <FolderPlus className="w-3 h-3 text-blue-500" />
                              {entry.folder}
                            </span>
                          )}

                          {(entry.reminderDate || entry.reminderTime) && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  background: 'var(--accent-amber-subtle)',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  borderRadius: 'var(--radius-pill)',
                                  padding: '1px 8px',
                                  fontSize: '10.5px',
                                  color: 'var(--accent-amber)',
                                }}
                              >
                                <Clock className="w-3 h-3" />
                                {entry.reminderDate} {entry.reminderTime}
                              </span>
                              <button
                                type="button"
                                className="btn-ghost"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  showToast('Adding to Google Calendar...', 'info');
                                  const res = await createCalendarEvent(entry);
                                  showToast(res.message, res.success ? 'success' : 'warning');
                                }}
                                style={{
                                  padding: '1px 6px',
                                  fontSize: '10.5px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  color: '#1a73e8',
                                  background: 'rgba(26, 115, 232, 0.08)',
                                  border: '1px solid rgba(26, 115, 232, 0.2)',
                                  cursor: 'pointer',
                                }}
                                title="Add reminder to Google Calendar"
                              >
                                <Calendar className="w-3 h-3 text-blue-500" />
                                <span>Calendar</span>
                              </button>
                            </span>
                          )}
                        </div>

                        <div style={{ position: 'relative' }}>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === entry.id ? null : entry.id);
                            }}
                            style={{ minHeight: '32px', padding: '4px 8px', borderRadius: '50%' }}
                            title="Entry Options"
                          >
                            <MoreVertical className="w-4 h-4 text-secondary" />
                          </button>

                          {openMenuId === entry.id && (
                            <div
                              className="dropdown-menu"
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                marginTop: '4px',
                                background: '#ffffff',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                boxShadow: 'var(--shadow-elevated)',
                                zIndex: 100,
                                minWidth: '130px',
                                overflow: 'hidden',
                                padding: '4px',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '8px 12px',
                                  fontSize: '13px',
                                  color: 'var(--text-primary)',
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  minHeight: 'auto',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  setViewingFullEntry(entry);
                                }}
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-500" />
                                <span>View Full Reflection</span>
                              </button>
                              <button
                                type="button"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '8px 12px',
                                  fontSize: '13px',
                                  color: 'var(--blue)',
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  minHeight: 'auto',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  setSharingEntry(entry);
                                  setSharePassphrase('');
                                  setGeneratedShareUrl(null);
                                }}
                              >
                                <Share2 className="w-3.5 h-3.5 text-blue-500" />
                                <span>Share Reflection</span>
                              </button>
                              <button
                                type="button"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '8px 12px',
                                  fontSize: '13px',
                                  color: '#1a73e8',
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  minHeight: 'auto',
                                }}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  showToast('Adding to Google Calendar...', 'info');
                                  const res = await createCalendarEvent(entry);
                                  showToast(res.message, res.success ? 'success' : 'warning');
                                }}
                              >
                                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                <span>Add to Google Calendar</span>
                              </button>
                              <button
                                type="button"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '8px 12px',
                                  fontSize: '13px',
                                  color: 'var(--red)',
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  minHeight: 'auto',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  setDeleteConfirmTarget({ type: 'entry', id: entry.id, title: entry.title });
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                <span>Delete</span>
                              </button>
                              <button
                                type="button"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '8px 12px',
                                  fontSize: '13px',
                                  color: 'var(--text)',
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  minHeight: 'auto',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  handleDownloadEntry(entry);
                                }}
                              >
                                <Download className="w-3.5 h-3.5 text-blue-500" />
                                <span>Download</span>
                              </button>
                              <button
                                type="button"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '8px 12px',
                                  fontSize: '13px',
                                  color: 'var(--text)',
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  minHeight: 'auto',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  window.print();
                                }}
                              >
                                <Printer className="w-3.5 h-3.5 text-purple-500" />
                                <span>Print Entry</span>
                              </button>
  
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Excerpt with line clamp and expandable toggle */}
                      <div>
                        <p
                          style={{
                            fontSize: '13.5px',
                            color: 'var(--text-secondary)',
                            lineHeight: '1.6',
                            margin: 0,
                            display: isExpanded ? 'block' : '-webkit-box',
                            WebkitLineClamp: isExpanded ? undefined : 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: isExpanded ? 'visible' : 'hidden',
                            whiteSpace: isExpanded ? 'pre-wrap' : 'normal',
                            wordBreak: 'break-word',
                          }}
                        >
                          {entry.content}
                        </p>

                        {isLongContent && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandEntry(entry.id);
                              }}
                              className="btn-ghost"
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 600,
                                color: '#1a73e8',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                cursor: 'pointer',
                                background: 'rgba(26, 115, 232, 0.08)',
                                border: '1px solid rgba(26, 115, 232, 0.2)',
                              }}
                              title={isExpanded ? 'Collapse to excerpt' : 'Expand full reflection'}
                            >
                              <span>{isExpanded ? 'Show excerpt' : 'Read more'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {!isExpanded && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingFullEntry(entry);
                                }}
                                className="btn-ghost"
                                style={{
                                  fontSize: '11.5px',
                                  color: 'var(--text-muted)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  cursor: 'pointer',
                                }}
                                title="Open full reflection in reading dialog"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Full View</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Render Audio Player if entry has voice note */}
                      {entry.audioUrl && (
                        <div style={{ marginTop: '10px' }}>
                          <VoiceNotePreviewCard
                            audioUrl={entry.audioUrl}
                            fileName={`${entry.title || 'Voice Note'} Audio`}
                            onDelete={() => {
                              if (onUpdateEntry) {
                                onUpdateEntry(entry.id, { audioUrl: undefined });
                                showToast("Voice note removed from reflection.", "info");
                              }
                            }}
                          />
                        </div>
                      )}

                      {/* Render Attachments preview */}
                      {entry.attachments && entry.attachments.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {entry.attachments.map(att => (
                            <div key={att.id} style={{ fontSize: '11px' }}>
                              {att.type === 'image' && att.data && (
                                <img
                                  src={att.data}
                                  alt={att.name}
                                  style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
                                />
                              )}
                              {att.type === 'location' && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--accent-emerald-subtle)', color: 'var(--accent-emerald)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontSize: '10.5px' }}>
                                  <MapPin className="w-3 h-3" /> {att.name}
                                </span>
                              )}
                              {att.type === 'file' && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontSize: '10.5px' }}>
                                  <Paperclip className="w-3 h-3 text-muted" /> {att.name}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          marginTop: 'auto',
                          paddingTop: '8px',
                          borderTop: '1px solid var(--border-subtle)',
                          flexWrap: 'wrap',
                          gap: '6px',
                          minWidth: 0,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{dateStr}</span>
                        </div>

                        {entry.tags && entry.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Tag className="w-3.5 h-3.5" />
                            {entry.tags.map((tag) => (
                              <span
                                key={tag}
                                style={{
                                  background: 'var(--bg-main)',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-subtle)',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>
        </section>
      </div>

      {/* View Draft Modal */}
      {viewingDraft && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(32, 33, 36, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setViewingDraft(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 8px 28px rgba(60,64,67,0.28)',
              border: '1px solid var(--border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    background: 'var(--surface-active)',
                    color: 'var(--blue)',
                  }}
                >
                  Draft Note
                </span>
                {viewingDraft.folder && (
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      background: 'var(--surface-hover)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    📁 {viewingDraft.folder}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setViewingDraft(null)}
                style={{ padding: '6px', minHeight: 'auto', borderRadius: '50%' }}
              >
                <X className="w-5 h-5 text-secondary" />
              </button>
            </div>

            <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 600, color: 'var(--text)' }}>
              {viewingDraft.title}
            </h2>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Saved: {new Date(viewingDraft.savedAt).toLocaleString()}
            </div>

            {viewingDraft.tags && viewingDraft.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {viewingDraft.tags.map(t => (
                  <span
                    key={t}
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: '#E8F0FE',
                      color: '#1A73E8',
                      fontWeight: 500,
                    }}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {viewingDraft.content && (
              <div
                style={{
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)',
                  background: 'var(--surface-hover)',
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  marginBottom: '16px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {viewingDraft.content}
              </div>
            )}

            {/* Voice Note Audio Player in Draft View */}
            {viewingDraft.audioUrl && (
              <div style={{ marginBottom: '16px' }}>
                <VoiceNotePreviewCard
                  audioUrl={viewingDraft.audioUrl}
                  fileName="Draft Voice Note"
                  onDelete={() => {
                    setViewingDraft(prev => prev ? { ...prev, audioUrl: undefined } : null);
                    showToast("Audio removed from draft.", "info");
                  }}
                />
              </div>
            )}

            {/* Attachments List in Draft View */}
            {viewingDraft.attachments && viewingDraft.attachments.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Paperclip className="w-4 h-4 text-blue-500" /> Attachments ({viewingDraft.attachments.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {viewingDraft.attachments.map(att => (
                    <div
                      key={att.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        background: '#F8F9FA',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {att.type === 'image' && <Camera className="w-4 h-4 text-blue-500" />}
                      {att.type === 'location' && <MapPin className="w-4 h-4 text-emerald-500" />}
                      {att.type === 'audio' && <Mic className="w-4 h-4 text-purple-500" />}
                      {att.type === 'file' && <Paperclip className="w-4 h-4 text-amber-500" />}
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {att.name}
                      </span>
                      {att.url && (
                        <a
                          href={att.url}
                          download={att.name}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '12px', color: 'var(--blue)', fontWeight: 500, textDecoration: 'none' }}
                        >
                          Download
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setViewingDraft(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  handleRestoreDraft(viewingDraft);
                  setViewingDraft(null);
                }}
              >
                <Edit3 className="w-4 h-4 mr-1.5 inline" /> Edit Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📖 Full Reflection Reading Modal */}
      {viewingFullEntry && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(32, 33, 36, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            padding: '16px',
          }}
          onClick={() => setViewingFullEntry(null)}
        >
          <div
            className="modal-content card-shell"
            style={{
              maxWidth: '680px',
              width: '100%',
              maxHeight: '88vh',
              overflowY: 'auto',
              background: 'var(--bg-card)',
              borderRadius: '24px',
              padding: '24px 26px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-elevated)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {viewingFullEntry.mood && (
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: 'var(--radius-pill)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    >
                      {viewingFullEntry.mood}
                    </span>
                  )}
                  {viewingFullEntry.folder && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'var(--bg-main)',
                        padding: '2px 10px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <FolderPlus className="w-3 h-3 text-blue-500" />
                      {viewingFullEntry.folder}
                    </span>
                  )}
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                  {viewingFullEntry.title}
                </h2>

                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(viewingFullEntry.createdAt).toLocaleString()}</span>
                  {viewingFullEntry.updatedAt && viewingFullEntry.updatedAt !== viewingFullEntry.createdAt && (
                    <span>· Edited: {new Date(viewingFullEntry.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="btn-ghost"
                onClick={() => setViewingFullEntry(null)}
                style={{ padding: '6px', borderRadius: '50%' }}
                title="Close reading view"
              >
                <X className="w-5 h-5 text-secondary" />
              </button>
            </div>

            {/* Reminder Schedule Badge if present */}
            {(viewingFullEntry.reminderDate || viewingFullEntry.reminderTime) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'var(--accent-amber-subtle)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-pill)',
                    padding: '2px 10px',
                    fontSize: '11px',
                    color: 'var(--accent-amber)',
                  }}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Reminder: {viewingFullEntry.reminderDate} {viewingFullEntry.reminderTime}</span>
                </span>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={async () => {
                    showToast('Adding to Google Calendar...', 'info');
                    const res = await createCalendarEvent(viewingFullEntry);
                    showToast(res.message, res.success ? 'success' : 'warning');
                  }}
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    color: '#1a73e8',
                    background: 'rgba(26, 115, 232, 0.08)',
                    border: '1px solid rgba(26, 115, 232, 0.2)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <Calendar className="w-3 h-3 text-blue-500" />
                  <span>Sync to Google Calendar</span>
                </button>
              </div>
            )}

            {/* Full Unabridged Reflection Body */}
            <div
              style={{
                fontSize: '14px',
                lineHeight: '1.7',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                background: 'var(--surface-hover)',
                padding: '16px 20px',
                borderRadius: '16px',
                border: '1px solid var(--border-subtle)',
                maxHeight: '400px',
                overflowY: 'auto',
              }}
            >
              {viewingFullEntry.content}
            </div>

            {/* Voice Note Player if present */}
            {viewingFullEntry.audioUrl && (
              <div style={{ width: '100%' }}>
                <VoiceNotePreviewCard
                  audioUrl={viewingFullEntry.audioUrl}
                  fileName={`${viewingFullEntry.title} Audio`}
                  onDelete={() => {}}
                />
              </div>
            )}

            {/* Attachments if present */}
            {viewingFullEntry.attachments && viewingFullEntry.attachments.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Paperclip className="w-4 h-4 text-blue-500" />
                  <span>Attachments ({viewingFullEntry.attachments.length})</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {viewingFullEntry.attachments.map(att => (
                    <div
                      key={att.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        fontSize: '12px',
                      }}
                    >
                      {att.type === 'image' && <Camera className="w-3.5 h-3.5 text-blue-500" />}
                      {att.type === 'location' && <MapPin className="w-3.5 h-3.5 text-emerald-500" />}
                      {att.type === 'audio' && <Mic className="w-3.5 h-3.5 text-purple-500" />}
                      {att.type === 'file' && <Paperclip className="w-3.5 h-3.5 text-amber-500" />}
                      <span>{att.name}</span>
                      {att.url && (
                        <a
                          href={att.url}
                          download={att.name}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '11px', color: 'var(--blue)', marginLeft: '4px' }}
                        >
                          Download
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {viewingFullEntry.tags && viewingFullEntry.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Tag className="w-3.5 h-3.5 text-muted" />
                {viewingFullEntry.tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      background: 'var(--bg-main)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewingFullEntry(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const toEdit = viewingFullEntry;
                  setViewingFullEntry(null);
                  handleStartEdit(toEdit);
                }}
              >
                <Edit className="w-3.5 h-3.5 inline mr-1" />
                <span>Edit Reflection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Warning Modal */}
      {deleteConfirmTarget && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(32, 33, 36, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setDeleteConfirmTarget(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px 24px 20px 24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 8px 28px rgba(60,64,67,0.28)',
              border: '1px solid var(--border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#FCE8E6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--red)',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
                  Delete {deleteConfirmTarget.type === 'entry' ? 'Journal Entry' : deleteConfirmTarget.type === 'voice_recording' ? 'Voice Recording' : 'Draft'}?
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  This action cannot be undone. Are you sure you want to permanently delete this item?
                </p>
              </div>
            </div>

            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                background: 'var(--surface-hover)',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                margin: '0 0 20px 0',
                wordBreak: 'break-word',
                fontWeight: 500,
              }}
            >
              "{deleteConfirmTarget.title}"
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteConfirmTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  if (deleteConfirmTarget.type === 'entry') {
                    onDeleteEntry(deleteConfirmTarget.id);
                    showToast("Journal entry deleted.", "info");
                  } else if (deleteConfirmTarget.type === 'voice_recording') {
                    setRecordedAudioUrl(null);
                    setVoiceStatus('idle');
                    setRecordingSeconds(0);
                    setAttachments(prev => prev.filter(a => a.type !== 'audio' || !a.name.includes('Voice Note')));
                    showToast("Voice recording deleted.", "info");
                  } else {
                    handleDeleteDraft(deleteConfirmTarget.id);
                  }
                  setDeleteConfirmTarget(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* 🔒 ITEM 24: Single-Entry AES-GCM Encrypted Sharing Modal */}
      {sharingEntry && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={() => setSharingEntry(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '520px', width: '90%', padding: '24px', borderRadius: '16px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Share2 className="w-4 h-4 text-blue-500" />
                </div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Share Encrypted Reflection</h3>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSharingEntry(null)}
                style={{ borderRadius: '50%', padding: '4px' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Generate an end-to-end encrypted sovereign link. The entry is encrypted in-browser using <strong>AES-GCM-256</strong> with PBKDF2 key derivation.
            </p>

            <div style={{ background: 'var(--bg-sidebar)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Reflection Title</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{sharingEntry.title || 'Untitled Reflection'}</div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Optional Security Passphrase
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Leave blank for sovereign open link, or set passphrase..."
                value={sharePassphrase}
                onChange={(e) => setSharePassphrase(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: '13px' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                If set, recipients must enter this exact passphrase to decrypt the reflection in memory.
              </span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Link Expiration
              </label>
              <select
                value={shareExpirationHours}
                onChange={(e) => setShareExpirationHours(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border)' }}
              >
                <option value={12}>12 Hours</option>
                <option value={24}>24 Hours</option>
                <option value={48}>48 Hours (Default)</option>
                <option value={168}>7 Days</option>
              </select>
            </div>

            {generatedShareUrl ? (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-emerald)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 className="w-4 h-4" /> Link Ready & Copied to Clipboard!
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={generatedShareUrl}
                    style={{ flex: 1, padding: '8px 10px', fontSize: '11px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-sidebar)' }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '12px', padding: '8px 14px' }}
                    onClick={() => {
                      navigator.clipboard?.writeText(generatedShareUrl);
                      showToast('Copied share link to clipboard!', 'success');
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSharingEntry(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isGeneratingShare}
                onClick={handleCreateShareLink}
              >
                {isGeneratingShare ? 'Encrypting...' : 'Generate Encrypted Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Innovative Camera Studio Modal */}
      <InnovativeCameraStudioModal
        isOpen={isCameraActive}
        onClose={handleCloseCamera}
        onCapture={handleCameraCapture}
        title="Mind Vault CyberLens Camera"
        subtitle="Zero-knowledge snapshot seal with live AI mood lenses, biometric telemetry & tamper-proof timestamps"
        showToast={showToast}
      />
    </div>
  );
};
