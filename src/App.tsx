import { ErrorBoundary } from './components/ErrorBoundary';
import { clearActiveSessionKey } from './services/cryptoEngine';
import React, { useState, useEffect, useCallback } from 'react';
// Google Enterprise UI/UX Polish: Command Palette, Skeleton Shimmers & Fluid Hotkeys
import { UserSession, VaultCredentials, VaultMode, TabType, JournalEntry, TimeCapsule, ToastMessage } from './types';
import { initAuthListener, signOutUser } from './services/authService';
import {
  getVaultCredentials,
  saveVaultCredentials,
  getJournalEntries,
  addJournalEntry,
  deleteJournalEntry,
  updateJournalEntry,
  getTimeCapsules,
  addTimeCapsule,
  unlockTimeCapsule,
  deleteTimeCapsule,
  getParallelPersona,
  getVaultSettings,
  recordGlobalHeartbeatPulse,
} from './services/vaultStorage';
import { VaultHeader } from './components/VaultHeader';
import { JournalView } from './components/JournalView';
import { InsightsView } from './components/InsightsView';
import { NexusMindView } from './components/NexusMindView';
import { TimeCapsulesView } from './components/TimeCapsulesView';
import { VaultSettingsView } from './components/VaultSettingsView';
import { ProtectedVaultGraphView } from './components/ProtectedVaultGraphView';
import { LoginPage } from './components/LoginPage';
import { PVUnlockScreen } from './components/PVUnlockScreen';
import { FirstTimeSetupModal } from './components/FirstTimeSetupModal';
import { UnlockVaultModal } from './components/UnlockVaultModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { VaultDecryptionSequenceModal } from './components/VaultDecryptionSequenceModal';
import { VaultSecurityHUD } from './components/VaultSecurityHUD';
import { AmbientVaultCanvas } from './components/AmbientVaultCanvas';
import { vaultAudio } from './utils/vaultAudioSynthesizer';
import { ToastContainer } from './components/ToastContainer';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { initGlobalReminderMonitor, requestNotificationPermission } from './utils/notificationEngine';
import { AutoLockWarningBanner } from './components/AutoLockWarningBanner';

export function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [credentials, setCredentials] = useState<VaultCredentials | null>(null);
  const [isPVUnlocked, setIsPVUnlocked] = useState(false);
  const [isDuressActive, setIsDuressActive] = useState(false);
  const [vaultMode, setVaultMode] = useState<VaultMode>('protected');
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [capsules, setCapsules] = useState<TimeCapsule[]>([]);
  const [parallelPersona, setParallelPersona] = useState<any>(() => getParallelPersona('default_user'));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sync Parallel Persona on user change and via custom update event
  useEffect(() => {
    const uid = user?.uid || 'default_user';
    setParallelPersona(getParallelPersona(uid));

    const handlePersonaUpdated = (e: any) => {
      if (e.detail?.personaData) {
        setParallelPersona(e.detail.personaData);
      } else {
        setParallelPersona(getParallelPersona(uid));
      }
    };

    window.addEventListener('vault_persona_updated', handlePersonaUpdated);
    return () => window.removeEventListener('vault_persona_updated', handlePersonaUpdated);
  }, [user]);

  // Theme Mode: 'dark' (Security Dark) | 'light' (System Light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('vault_theme_mode');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark'; // Default to high-contrast Security Dark mode
  });

  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isDecryptionSequenceOpen, setIsDecryptionSequenceOpen] = useState(false);
  const [sessionHash, setSessionHash] = useState('0x8F4A9C2B7E1D3F00');
  const [vaultSettings, setVaultSettings] = useState(() => getVaultSettings(user?.uid || 'guest'));
  const [autoLockSecondsLeft, setAutoLockSecondsLeft] = useState(() => {
    const s = getVaultSettings(user?.uid || 'guest');
    return (s.autoLockMinutes || 15) * 60;
  });

  // Sync Vault Settings on user change and via custom update event
  useEffect(() => {
    const uid = user?.uid || 'guest';
    const s = getVaultSettings(uid);
    setVaultSettings(s);

    const handleSettingsUpdated = (e: any) => {
      const nextSettings = e.detail?.settings || getVaultSettings(uid);
      setVaultSettings(nextSettings);
      const mins = nextSettings.autoLockMinutes || 15;
      setAutoLockSecondsLeft(mins * 60);
    };

    window.addEventListener('vault_settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('vault_settings_updated', handleSettingsUpdated);
  }, [user]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ⚡ ITEMS 21 & 22: Global Keyboard Shortcuts Engine
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Ctrl+K / Cmd+K: Toggle Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // 2. Escape: Dismiss any active modal
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false);
        } else if (isUnlockModalOpen) {
          setIsUnlockModalOpen(false);
        } else if (isSetupModalOpen) {
          setIsSetupModalOpen(false);
        } else if (isDecryptionSequenceOpen) {
          setIsDecryptionSequenceOpen(false);
        }
        return;
      }

      // 3. Ctrl+N / Cmd+N: Quick New Entry
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveTab('journal');
        showToast('Switched to Journal Canvas (Ctrl+N)', 'info');
        return;
      }

      // 4. Ctrl+S / Cmd+S: Intercept browser save & dispatch vault save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('vault_quick_save'));
        showToast('⚡ Quick-Save triggered (Ctrl+S)', 'success');
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isCommandPaletteOpen, isUnlockModalOpen, isSetupModalOpen, isDecryptionSequenceOpen, showToast]);

  // 🌓 ITEM 30: System Theme Auto-Detection & DOM Synchronization
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('vault_theme_mode');
      if (!saved) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  // Sync Global Theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('vault_theme_mode', theme);
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      showToast(
        next === 'dark' ? 'Switched to High-Contrast Security Dark Mode' : 'Switched to System Light Mode',
        'info'
      );
      return next;
    });
  }, [showToast]);

  // Sync Auth state
  useEffect(() => {
    const unsubscribe = initAuthListener((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const creds = getVaultCredentials(currentUser.uid);
        setCredentials(creds);
        if (!creds) {
          setIsSetupModalOpen(true);
          setIsPVUnlocked(false);
        } else {
          // Mandatory PIN gate on returning/subsequent login
          setIsPVUnlocked(false);
        }
        setEntries(getJournalEntries(currentUser.uid));
        setCapsules(getTimeCapsules(currentUser.uid));
        setActiveTab('journal');
      } else {
        setCredentials(null);
        setEntries([]);
        setCapsules([]);
        setIsPVUnlocked(false);
        setIsDuressActive(false);
        setActiveTab('login');
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle Initial Security Setup Completion
  const handleCompleteSetup = (pin: string, secret: string) => {
    if (!user) return;
    const saved = saveVaultCredentials(user.uid, pin, secret);
    setCredentials(saved);
    setIsSetupModalOpen(false);
    setIsPVUnlocked(true);
    setIsDuressActive(false);
    setVaultMode('protected');
    showToast("Security credentials configured. Protected Vault Active.", "success");
  };

  // Handle PIN Unlock on PVUnlockScreen
  const handlePVUnlockSuccess = useCallback(
    (mode: 'standard' | 'duress') => {
      if (mode === 'duress') {
        setIsDuressActive(true);
        setIsPVUnlocked(true);
        setVaultMode('protected');
        const uid = user?.uid || 'default_user';
        const persona = getParallelPersona(uid);
        setEntries(persona.entries || []);
        showToast("Protected Vault Access Granted", "success");
      } else {
        setIsDuressActive(false);
        setIsPVUnlocked(true);
        setVaultMode('protected');
        const uid = user?.uid || 'default_user';
        setEntries(getJournalEntries(uid));
        setCapsules(getTimeCapsules(uid));
        showToast("Protected Vault Access Granted", "success");
      }
    },
    [user, showToast]
  );

  // Handle Opening Unlock Modal with Strict Lock & Duress Air-Gap Checks
  const handleOpenUnlockModal = useCallback(() => {
    if (!isPVUnlocked || isDuressActive) {
      // 🛡️ Anti-Coercion Air-Gap: Never reveal or open the Secret Gate when locked or in Duress Mode
      return;
    }
    setIsUnlockModalOpen(true);
  }, [isPVUnlocked, isDuressActive]);

  // Lock Vault back to Protected Cover Mode or Lock Screen
  const handleLockVault = useCallback(() => {
    // 🛡️ Zeroize Ephemeral PBKDF2 / AES-GCM CryptoKey from volatile RAM
    clearActiveSessionKey();

    if (vaultMode === 'real') {
      setVaultMode('protected');
      if (activeTab !== 'journal' && activeTab !== 'insights') {
        setActiveTab('journal');
      }
      showToast("Sovereign Vault Locked. Returned to Protected Cover Mode.", "info");
    } else {
      setIsPVUnlocked(false);
      setIsDuressActive(false);
      showToast("Protected Vault Locked.", "info");
    }
  }, [vaultMode, activeTab, showToast]);
  // ⚡ Panic Purge: Instant Emergency Duress Trap & Secret Gate Air-Gap
  const handlePanicPurge = useCallback(() => {
    // 🛡️ 1. Instantly zeroize active cryptographic session & wipe RAM CryptoKey
    clearActiveSessionKey();
    setSessionHash('');
    setAutoLockSecondsLeft(0);

    // 2. Activate Duress Protocol & Air-gap Secret Gate
    setIsDuressActive(true);
    setVaultMode('protected');

    // 3. Immediately deploy plausible deniability cover entries
    const uid = user?.uid || 'default_user';
    const persona = getParallelPersona(uid);
    setEntries(persona.entries || []);
    setActiveTab('journal');

    // 4. Zeroize any modals
    setIsUnlockModalOpen(false);

    // 5. Sound and feedback
    try {
      vaultAudio.playPanicLockSound();
    } catch {}

    showToast("⚠️ Emergency Partition Purged. Cover Domain Synchronized.", "warning");
  }, [user, showToast]);


  // Handle Real Vault Unlock Trigger (Starts Decryption Sequence & Proof-of-Life Pulse)
  const handleUnlockSuccess = useCallback(() => {
    setIsUnlockModalOpen(false);
    // Generate fresh cryptographic session verification hash
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    setSessionHash('0x' + randomHex);

    const currentSettings = getVaultSettings(user?.uid || 'guest');
    const mins = currentSettings.autoLockMinutes || 15;
    setAutoLockSecondsLeft(mins * 60);

    // 🛡️ Automatic Proof-of-Life Heartbeat Pulse on Secret Code Entry
    if (user) {
      if (currentSettings.autoHeartbeatOnUnlock !== false) {
        recordGlobalHeartbeatPulse(user.uid);
      }
    }

    setIsDecryptionSequenceOpen(true);
  }, [user]);

  // Handle Cinematic Decryption Sequence Completion
  const handleDecryptionSequenceComplete = useCallback(() => {
    setIsDecryptionSequenceOpen(false);
    setVaultMode('real');
    setActiveTab('graph');
    showToast("Sovereign Cryptographic Enclave Mounted. Proof-of-Life pulse recorded.", "success");
  }, [showToast]);

  // Extend Active Session
  const handleExtendSession = useCallback(() => {
    const currentSettings = getVaultSettings(user?.uid || 'guest');
    const mins = currentSettings.autoLockMinutes || 15;
    setAutoLockSecondsLeft(mins * 60);
    showToast(`Session extended (+${mins} minutes).`, "info");
  }, [user, showToast]);

  // Auto-Lock Inactivity Countdown Timer (Active when in Real Vault Mode)
  useEffect(() => {
    if (vaultMode !== 'real') return;

    const interval = setInterval(() => {
      setAutoLockSecondsLeft((prev) => {
        if (prev <= 1) {
          handleLockVault();
          vaultAudio.playPanicLockSound();
          showToast("Session expired. Auto-locked to Protected Vault.", "warning");
          const currentSettings = getVaultSettings(user?.uid || 'guest');
          const mins = currentSettings.autoLockMinutes || 15;
          return mins * 60;
        }
        if (prev === 61) {
          vaultAudio.playWarningPulse();
          showToast("Security Notice: 1 minute remaining before auto-lock.", "warning");
        }
        if (prev === 31) {
          vaultAudio.playWarningPulse();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [vaultMode, handleLockVault, showToast, user]);

  // Reset Secret Code Recovery
  const handleResetSecretCode = () => {
    if (!user) return;
    setIsUnlockModalOpen(false);
    setIsSetupModalOpen(true);
    showToast("Master Recovery: Enter your master PIN to reconfigure secret code.", "info");
  };

  // Sign out user
  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setCredentials(null);
    setIsPVUnlocked(false);
    setIsDuressActive(false);
    setActiveTab('login');
    showToast("Signed out successfully", "info");
  };

  // Entry Management
  const handleAddEntry = (entryOrTitle: any, content?: string, tags: string[] = [], mood?: string) => {
    if (!user) return;
    let payload: any;
    if (typeof entryOrTitle === 'object' && entryOrTitle !== null) {
      payload = entryOrTitle;
    } else {
      payload = {
        title: entryOrTitle || 'Untitled Reflection',
        content: content || '',
        tags: tags || [],
        mood: (mood as any) || 'neutral',
      };
    }
    const newEntry = addJournalEntry(user.uid, payload);
    setEntries((prev) => [newEntry, ...prev]);
    showToast("Journal reflection sealed and encrypted.", "success");
  };

  const handleUpdateEntry = (id: string, updatedFields: Partial<JournalEntry>) => {
    if (!user) return;
    const updated = updateJournalEntry(user.uid, id, updatedFields);
    setEntries(updated);
  };

  const handleDeleteEntry = (id: string) => {
    if (!user) return;
    deleteJournalEntry(user.uid, id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    showToast("Entry purged securely.", "info");
  };

  // Time Capsule Management
  const handleAddCapsule = (
    capsuleOrTitle: any,
    message?: string,
    unlockDate?: string,
    unlockMood?: string,
    tags: string[] = []
  ) => {
    if (!user) return;
    let payload: any;
    if (typeof capsuleOrTitle === 'object' && capsuleOrTitle !== null) {
      payload = capsuleOrTitle;
    } else {
      payload = {
        title: capsuleOrTitle || 'Untitled Capsule',
        message: message || '',
        unlockDate,
        targetMood: unlockMood as any,
        lockType: unlockDate && unlockMood ? 'both' : unlockDate ? 'time' : 'mood',
      };
    }
    const newCapsule = addTimeCapsule(user.uid, payload);
    setCapsules((prev) => [newCapsule, ...prev]);
    showToast("Time Capsule cryptographically sealed with SHA-256 integrity seal.", "success");
  };

  const handleUnlockCapsule = (id: string) => {
    if (!user) return;
    const updated = unlockTimeCapsule(user.uid, id);
    if (updated) {
      setCapsules(updated);
      showToast("Time Capsule unlocked successfully!", "success");
    }
  };

  const handleDeleteCapsule = (id: string) => {
    if (!user) return;
    deleteTimeCapsule(user.uid, id);
    setCapsules((prev) => prev.filter((c) => c.id !== id));
    showToast("Time Capsule purged.", "info");
  };

  return (
    <ErrorBoundary>
      <div className="vault-app">
        <AmbientVaultCanvas />

      {/* Global Application Header */}
      <VaultHeader
        user={user}
        vaultMode={vaultMode}
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (!isPVUnlocked) return;
          if (isDuressActive && (tab === 'capsules' || tab === 'settings')) {
            return;
          }
          if ((tab === 'capsules' || tab === 'settings') && vaultMode !== 'real') {
            handleOpenUnlockModal();
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenUnlockModal={handleOpenUnlockModal}
        onLockVault={handleLockVault}
        onSignIn={() => setActiveTab('login')}
        onSignOut={handleSignOut}
        isConfigured={!!credentials}
        onOpenSetupModal={() => setIsSetupModalOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        isDuressActive={isDuressActive}
        isPVUnlocked={isPVUnlocked}
      />

      {/* View 1: Unauthenticated Login Page */}
      {!user && (
        <LoginPage onSignInSuccess={(u) => setUser(u)} showToast={showToast} />
      )}

      {/* View 2: Mandatory Protected Vault PIN Screen (When User is authenticated but PV is locked) */}
      {user && credentials && !isPVUnlocked && (
        <PVUnlockScreen
          user={user}
          credentials={credentials}
          onUnlockSuccess={handlePVUnlockSuccess}
          onSignOut={handleSignOut}
          showToast={showToast}
        />
      )}

      {/* View 3: Main Authenticated Vault App (When PV is Unlocked) */}
      {user && isPVUnlocked && (
        <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
          {/* Security HUD Banner (Active in Real Vault Mode) */}
          {vaultMode === 'real' && (
            <VaultSecurityHUD
              vaultMode={vaultMode}
              secondsLeft={autoLockSecondsLeft}
              sessionHash={sessionHash}
              onExtendSession={handleExtendSession}
              onEmergencyLock={handleLockVault}
              onPanicLock={handlePanicPurge}
              onToggleTheme={handleToggleTheme}
              theme={theme}
            />
          )}

          {/* Main Content Workspace */}
          <main className="vault-main-content">
            {/* Tab 1: 📝 Journal & Reflection */}
            {activeTab === 'journal' && (
              <JournalView
                userId={user?.uid || 'default_user'}
                vaultMode={vaultMode}
                entries={isDuressActive ? (parallelPersona.entries || []) : entries}
                onAddEntry={handleAddEntry}
                onDeleteEntry={handleDeleteEntry}
            onUpdateEntry={handleUpdateEntry}
                onOpenUnlockModal={handleOpenUnlockModal}
                showToast={showToast}
              />
            )}

            {/* Tab 2: 📈 Insights */}
            {activeTab === 'insights' && (
              <InsightsView entries={vaultMode === 'real' ? entries : (parallelPersona.entries || [])} />
            )}

            {/* Tab 3: 🕸️ Memory Graph (NMV Real Mode or Protected Vault Parallel Persona) */}
            {(activeTab === 'graph' || activeTab === 'nexus') && (
              vaultMode === 'real' ? (
                <NexusMindView
                  userId={user?.uid || 'default_user'}
                  entries={entries}
                  capsules={capsules}
                  onAddCapsule={handleAddCapsule}
                  onUnlockCapsule={handleUnlockCapsule}
                  onDeleteCapsule={handleDeleteCapsule}
                  showToast={showToast}
                />
              ) : (
                <ProtectedVaultGraphView
                  userId={user?.uid || 'default_user'}
                  onOpenUnlockModal={handleOpenUnlockModal}
                  showToast={showToast}
                />
              )
            )}

            {/* Tab 4: ⏳ Time Capsules (NMV Real Mode Only) */}
            {activeTab === 'capsules' && vaultMode === 'real' && (
              <TimeCapsulesView
                userId={user?.uid || 'default_user'}
                capsules={capsules}
                onAddCapsule={handleAddCapsule}
                onUnlockCapsule={handleUnlockCapsule}
                onDeleteCapsule={handleDeleteCapsule}
                showToast={showToast}
              />
            )}

            {/* Tab 5: ⚙️ Vault Settings (NMV Real Mode Only) */}
            {activeTab === 'settings' && vaultMode === 'real' && (
              <VaultSettingsView
                user={user}
                credentials={credentials}
                onCredentialsUpdated={(newCreds) => setCredentials(newCreds)}
                onLockVault={handleLockVault}
                onRefreshData={() => {
                  const currentUid = user?.uid || 'default_user';
                  setEntries(getJournalEntries(currentUid));
                  setCapsules(getTimeCapsules(currentUid));
                }}
                showToast={showToast}
              />
            )}
          </main>
        </div>
      )}

      {/* Global Command Palette Modal (Ctrl+K / Cmd+K) */}
      <KeyboardShortcutsModal isOpen={isShortcutsModalOpen} onClose={() => setIsShortcutsModalOpen(false)} />
      <PrivacyPolicyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        vaultMode={vaultMode}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (!isPVUnlocked) return;
          if (isDuressActive && (tab === 'capsules' || tab === 'settings')) {
            return;
          }
          if ((tab === 'capsules' || tab === 'settings') && vaultMode !== 'real') {
            handleOpenUnlockModal();
          } else {
            setActiveTab(tab);
          }
        }}
        entries={entries}
        onOpenUnlockModal={handleOpenUnlockModal}
        onLockVault={handleLockVault}
        onPanicPurge={handlePanicPurge}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isDuressActive={isDuressActive}
      />

      {/* First-Time Security Setup Modal */}
      <FirstTimeSetupModal
        isOpen={isSetupModalOpen}
        onComplete={handleCompleteSetup}
        showToast={showToast}
      />

      {/* Unlock Real Vault Modal */}
      <UnlockVaultModal
        isOpen={isUnlockModalOpen}
        onClose={() => setIsUnlockModalOpen(false)}
        credentials={credentials}
        onSuccess={handleUnlockSuccess}
        onResetSecretCode={handleResetSecretCode}
        userEmail={user?.email}
        showToast={showToast}
      />

      {/* Cinematic Quantum Decryption Sequence Modal (1.4s Transition) */}
      <VaultDecryptionSequenceModal
        isOpen={isDecryptionSequenceOpen}
        onComplete={handleDecryptionSequenceComplete}
      />

      {/* Floating Ambient Auto-Lock Warning Banner (Triggers at 30 seconds) */}
      {vaultMode === 'real' && autoLockSecondsLeft <= 30 && autoLockSecondsLeft > 0 && (
        <AutoLockWarningBanner
          secondsLeft={autoLockSecondsLeft}
          onExtend={handleExtendSession}
          onLockNow={() => {
            handleLockVault();
            vaultAudio.playPanicLockSound();
          }}
        />
      )}

      {/* Toast Notifications & PWA Install Banner */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      <PWAInstallBanner />
    </div>
    </ErrorBoundary>
  );
}

export default App;
