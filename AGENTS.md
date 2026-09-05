#   Nexus Mind Vault - Dual-Mode Security Architecture & Agent Directives
> **System Classification**: Sovereign Zero-Knowledge Cryptographic Enclave & Cognitive Mirror
> **Standard Version**: 2.0.0 (Production Hardened)
---
##  System Architecture Overview
Nexus Mind Vault is an offline-first, zero-knowledge cognitive reflection platform designed around the **STRIDE Threat Modeling Matrix** and **W3C WebCrypto Standards**. The enclave segregates operational data across strict cryptographic partitions:
```
+-------------------------------------------------------------------------+
|                         Sovereign Web Client                            |
|  +---------------------+  +--------------------+  +------------------+  |
|  |   Journal & Canvas  |  |  Time Capsules     |  |  Mind Graph      |  |
|  |   (Drafts, Audio)   |  |  (SHA-256 Sealed)  |  |  (D3 Interactive)|  |
|  +---------------------+  +--------------------+  +------------------+  |
|                             |                                           |
|                             v                                           |
|       +---------------------------------------------------------+       |
|       |     W3C WebCrypto Authenticated Cryptographic Engine    |       |
|       |  * PBKDF2 (600k rounds)  * AES-GCM-256  * HMAC-SHA-256  |       |
|       +---------------------------------------------------------+       |
+-----------------------------------|-------------------------------------+
                                    | Encrypted Ciphertext Only
                                    v
+-------------------------------------------------------------------------+
|                  Zero-Knowledge Backend Services                        |
|  +----------------------------+    +---------------------------------+  |
|  | Cloud Firestore Sync Engine|    | Resilient 4-Stage Gemini Ladder |  |
|  | (Ciphertext + SHA Digests) |    | (Air-Gapped Proxy, Rate-Limited)|  |
|  +----------------------------+    +---------------------------------+  |
+-------------------------------------------------------------------------+
```
---
## [lock] Cryptographic Security Contracts
1. **Zero Plaintext Egress**: Plaintext reflections, passphrases, and PINs MUST NEVER be transmitted across HTTP boundaries.
2. **Deterministic Tamper Rejection**: All data partitions calculate synchronous HMAC-SHA-256 or SHA-256 digests; modified ciphertext is rejected on read.
3. **Duress Segregation**: Entering a decoy PIN unlocks an isolated, simulated decoy vault without exposing master secrets.
4. **AI Air-Gap Isolation**: When AI features are toggled off by the user, zero network packets are dispatched to external inference endpoints.
5. **Memory Hygiene**: Active `CryptoKey` instances reside in volatile RAM only and are zeroized upon Enclave Lock or Panic Purge.
---
##  Directory Structure & Component Hierarchy
* **`src/components/`**:
  * `JournalView.tsx`: Rich reflection canvas, templates, streak counter, search, audio notes.
  * `TimeCapsulesView.tsx`: Cryptographically sealed time-locked vaults.
  * `SemanticMemoryGraph.tsx`: D3.js physics force-directed concept graph with SVG/PNG exports.
  * `LegacyGuardianCapsuleView.tsx`: Proof-of-life dead man's switch & claim token engine.
  * `VaultSettingsView.tsx`: Multi-device manager, biometrics, theme, import/export, and privacy policies.
  * `ErrorBoundary.tsx`: Enclave-level crash interceptor and session recovery.
  * `KeyboardShortcutsModal.tsx`: Hotkey reference dialog (`?` key).
  * `PrivacyPolicyModal.tsx`: GDPR / CCPA sovereign zero-knowledge compliance disclosure.
* **`src/services/`**:
  * `cryptoEngine.ts`: WebCrypto AES-GCM-256, PBKDF2, HMAC-SHA-256, and tamper checks.
  * `vaultStorage.ts`: Local & Cloud Firestore persistence manager.
  * `logger.ts`: Zero-knowledge structured telemetry logger with automatic redaction.
* **`src/__tests__/`**:
  * Vitest automated unit and integration test suite.
---
## [shield] Architectural Defense & STRIDE Threat Model (F5.2 & F5.3 Hardening)
### 1. HSM/KMS vs. Sovereign Browser Enclave Key Extractability (F5.2 Analysis)
* **Technical Rationale**: W3C WebCrypto requires `extractable: true` on derived master keys to permit cryptographic wrapping via `crypto.subtle.wrapKey('raw', keyToWrap, wrappingKey, ...)` for user-directed, encrypted JSON vault backups and cross-device migration.
* **Sovereign Offline Guarantee**: Mandating a centralized Hardware Security Module (HSM) or Cloud KMS would destroy the core architectural tenet of Nexus Mind Vault - offline-first sovereign zero-knowledge privacy. With Cloud KMS, the cloud provider holds envelope access; with WebCrypto client enclaves, the user retains absolute cryptographic sovereignty without cloud key custody.
* **Ephemeral RAM Hygiene**: Master keys reside strictly in volatile memory variables (`_inMemoryCryptoKey`) and are zeroized upon Enclave Lock, Panic Purge, tab unload, or inactivity timeout. Raw key material is NEVER persisted to LocalStorage, IndexedDB, or transmitted over the wire.
* **Dual-Mode Derivation**: `deriveKeyFromPassphrase` additionally accepts `extractable: false` for strict operational sessions where backup export capabilities are disabled.
### 2. Multi-Instance Distributed Rate Limiting on Google Cloud Run (F5.3 Architecture)
* **Threat Vector**: In horizontal auto-scaling environments (scaling up to 10 instances with scale-to-zero), in-memory rate limiters isolate state per container instance and reset on cold starts, allowing distributed abuse.
* **Countermeasure**: Server-side endpoints (`/api/gemini`, `/api/gemini/audio`, `/api/functions/:functionName`) leverage a distributed sliding-window counter backed by Google Cloud Firestore (`_rate_limits` collection with atomic increments).
* **Cross-Instance Synchronization**: Rate limit counters are keyed by authenticated Firebase UID (or edge client IP) across fixed time windows, ensuring uniform quota enforcement across all 10 Cloud Run container instances.
* **Resilient Graceful Fallback**: If Firestore is unreachable or operating in an offline/local development environment, the engine transparently falls back to high-performance in-memory sliding-window limiting without service disruption.
