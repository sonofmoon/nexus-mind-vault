# 🧠 Nexus Mind Vault — Dual-Mode Security Architecture & Agent Directives

> **System Classification**: Sovereign Zero-Knowledge Cryptographic Enclave & Cognitive Mirror
> **Standard Version**: 2.0.0 (Production Hardened)

---

## 🏛️ System Architecture Overview

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
|       |  * PBKDF2 (100k rounds)  * AES-GCM-256  * HMAC-SHA-256  |       |
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

## 🔒 Cryptographic Security Contracts

1. **Zero Plaintext Egress**: Plaintext reflections, passphrases, and PINs MUST NEVER be transmitted across HTTP boundaries.
2. **Deterministic Tamper Rejection**: All data partitions calculate synchronous HMAC-SHA-256 or SHA-256 digests; modified ciphertext is rejected on read.
3. **Duress Segregation**: Entering a decoy PIN unlocks an isolated, simulated decoy vault without exposing master secrets.
4. **AI Air-Gap Isolation**: When AI features are toggled off by the user, zero network packets are dispatched to external inference endpoints.
5. **Memory Hygiene**: Active `CryptoKey` instances reside in volatile RAM only and are zeroized upon Enclave Lock or Panic Purge.

---

## 🧭 Directory Structure & Component Hierarchy

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
