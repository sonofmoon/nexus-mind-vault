export interface UserSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

export interface VaultCredentials {
  salt: string;              // Base64 16-byte CSPRNG random salt
  pinHash: string;          // SHA-256 PIN verifier hash with salt
  secretVerifier: string;   // SHA-256 Secret verifier hash with salt
  createdAt: string;
  isZeroKnowledgeV2: boolean;
  isEncryptedFormat?: boolean;
  // Legacy backward-compatibility migration fields
  pin?: string;
  secret?: string;
}

export type VaultMode = 'protected' | 'real';

export type TabType = 'journal' | 'insights' | 'graph' | 'capsules' | 'settings' | 'nexus' | 'login';

export interface VaultSettings {
  autoLockMinutes: number; // e.g. 5, 15, 30, 0 (disabled)
  duressPin?: string;
  stealthModeEnabled: boolean;
  biometricsEnabled: boolean;
  highEntropyKeyDerivation: boolean;
  tamperAuditLogging: boolean;
  autoHeartbeatOnUnlock?: boolean; // Automatically emit Proof-of-Life pulse on Secret Code unlock
  aiSynthesisEnabled?: boolean;     // Opt-out toggle for server-side AI analysis
}

export type MoodType = 'calm' | 'focused' | 'creative' | 'anxious' | 'energetic' | 'tired' | 'neutral';

export interface AttachmentItem {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'text' | 'file' | 'location';
  url?: string;
  size?: number;
  data?: string;
  locationDetails?: { lat: number; lng: number; address?: string };
}

export type CapsuleLockType = 'time' | 'mood' | 'both';

export type LegacyGuardianPolicyCategory = 'family' | 'crypto' | 'business' | 'personal' | 'custom';

export type LegacyGuardianHeartbeatStatus = 'active' | 'grace' | 'pending_release' | 'released';

export interface LegacyGuardianContact {
  email: string;
  name?: string;
  relationship?: string;
  phone?: string;
  deliveryMethod?: 'email' | 'secure_link' | 'sms';
}

export interface LegacyGuardianPolicy {
  id: string;
  userId: string;
  title: string;
  category?: LegacyGuardianPolicyCategory;
  emergencyMessage: string;
  checkInWindowHours: number; // e.g. 72 hours
  graceWindowHours: number;    // e.g. 24 hours
  trustedContacts: string[];   // comma-separated emails or array of emails
  contactDetails?: LegacyGuardianContact[];
  lastCheckInAt: string;       // ISO timestamp
  simulatedTimeOffsetHours?: number; // for demo testing/time-travel simulation
  policyEnabled: boolean;
  status: LegacyGuardianHeartbeatStatus;
  attachments?: AttachmentItem[];
  photos?: string[];
  audioUrl?: string;
  integrityHash: string;
  createdAt: string;
  updatedAt: string;
  lastEvaluatedAt?: string;
  releaseDispatchedAt?: string;
}

// Backward-compatibility aliases
export type DeadManHeartbeatStatus = LegacyGuardianHeartbeatStatus;
export type DeadManContact = LegacyGuardianContact;
export type DeadManSafetyCapsulePolicy = LegacyGuardianPolicy;

export interface TimeCapsule {
  id: string;
  userId: string;
  title: string;
  message: string;
  sealedAt: string;
  lockType: CapsuleLockType;
  unlockDate?: string; // ISO datetime string
  targetMood?: MoodType; // mood trigger e.g. 'anxious' | 'calm' | 'focused'
  moodUnlockPrompt?: string; // e.g. "Open when you are feeling anxious and need reassurance"
  attachments?: AttachmentItem[];
  photos?: string[]; // base64 images
  audioUrl?: string; // recorded voice notes
  locationTag?: string;
  isOpened: boolean;
  openedAt?: string;
  integrityHash: string; // Genuine NIST FIPS 180-4 SHA-256 seal fingerprint
  hmacSignature?: string; // Optional HMAC-SHA-256 tamper-evidence signature
  isTampered?: boolean;   // Active read-time integrity flag
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood: MoodType;
  tags: string[];
  folder?: string;
  reminderDate?: string;
  reminderTime?: string;
  attachments?: AttachmentItem[];
  location?: string;
  audioUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalDraft {
  id: string;
  title: string;
  content: string;
  mood?: MoodType;
  tags?: string[];
  folder?: string;
  attachments?: AttachmentItem[];
  audioUrl?: string;
  sourceTab?: 'write' | 'talk' | 'attach' | 'voice';
  savedAt: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export type ConceptCategory = 'theme' | 'emotion' | 'insight' | 'project' | 'entity';

export interface MemoryNode {
  id: string;
  label: string;
  category: ConceptCategory | string;
  val: number; // Node weight/radius based on frequency / centrality
  entryCount: number;
  entryIds: string[];
  sentiment?: string;
  summary?: string;
  domain?: string;
  // D3 force simulation coordinate properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface MemoryLink {
  source: string | MemoryNode;
  target: string | MemoryNode;
  relationship: string; // e.g. "Influences", "Reinforces", "Triggers", "Co-occurs with", "Catalyzes", "Evolves into"
  strength: number; // 1 to 5
  coOccurrences: number;
  contextExcerpt?: string;
}

export interface SemanticGraphData {
  nodes: MemoryNode[];
  links: MemoryLink[];
  metrics: {
    totalConcepts: number;
    totalConnections: number;
    clustersCount: number;
    semanticDensity: number;
    centralConcept: string;
  };
}

export interface ParallelPersonaData {
  targetDomain: string;
  personaTitle: string;
  entries: JournalEntry[];
  graph: SemanticGraphData;
  generatedAt: string;
}
