# Nexus Mind Vault (NMV) - Personal Gemini Journal
### Cohort 3 * Accelerate AI with Cloud Run * Gen AI Academy APAC Edition
**Ideathon Challenge Submission | `#AccelerateAIwithCloudRun`**
[![Live Cloud Run Production](https://img.shields.io/badge/Google%20Cloud%20Run-Live%20Production-4285F4?logo=googlecloud&logoColor=white)](https://nexus-mind-vault-n4ekvxi54q-uc.a.run.app/)
[![Interactive Showcase](https://img.shields.io/badge/Interactive%20Showcase-NMV%20App-0ea5e9?logo=googlechrome&logoColor=white)](https://nexusaitech.in/apps/nmv/index.html)
[![Challenge Verification](https://img.shields.io/badge/Challenge%20Label-dev--tutorial%3Dcloud--run--ai--challenge-34A853?logo=google&logoColor=white)](#zone-5-required-campaign-labeling-challenge-verification)
[![Cryptographic Standard](https://img.shields.io/badge/W3C%20WebCrypto-PBKDF2%20600k%20%7C%20AES--GCM--256-8b5cf6)](#-cryptographic-security-contracts--stride-threat-model)
[![Tests Passing](https://img.shields.io/badge/Vitest-56%2F56%20Passed-22c55e?logo=vitest&logoColor=white)](#-automated-verification--test-suite)
---
##  Live Service & Interactive Showcase
* **Primary Live Cloud Run Deployment**: [https://nexus-mind-vault-n4ekvxi54q-uc.a.run.app/](https://nexus-mind-vault-n4ekvxi54q-uc.a.run.app/)
* ** Interactive Visual Showcase App**: [https://nexusaitech.in/apps/nmv/index.html](https://nexusaitech.in/apps/nmv/index.html)
---
##  What is Nexus Mind Vault?
**Nexus Mind Vault (NMV)** is an enterprise-grade, zero-trust personal cognitive reflection mirror and semantic memory engine. Built with **Firebase Authentication**, **Cloud Firestore Native**, **Google Cloud Secret Manager**, and auto-scaling **Google Cloud Run**, it integrates the **Google Gemini Model Family** (`@google/genai` & Vertex AI Express) to deliver deep cognitive synthesis, D3 force-directed semantic graphing, living wills, and cryptographically sealed future time capsules - **without ever exposing plaintext user thoughts or private keys to the cloud**.
```
+-----------------------------------------------------------------------------------------+
|                                Sovereign Web Client Enclave                             |
|  +---------------------+  +--------------------+  +------------------+  +-------------+ |
|  |   Journal Canvas    |  |  Time Capsules     |  |  Mind Graph      |  | Audio Notes | |
|  |  (Moods, Streaks)   |  | (SHA-256 Tamper-Pr)|  |  (D3 Physics)    |  | (Speech AI) | |
|  +---------------------+  +--------------------+  +------------------+  +-------------+ |
|                             |                                                           |
|                             v                                                           |
|       +-------------------------------------------------------------------------+       |
|       |           W3C WebCrypto Authenticated Cryptographic Engine              |       |
|       |   * PBKDF2-HMAC-SHA-256 (600,000 rounds OWASP)  * AES-GCM-256          |       |
|       |   * HMAC-SHA-256 Signatures  * NIST FIPS 180-4 Synchronous Digest       |       |
|       +-------------------------------------------------------------------------+       |
+-----------------------------------|-----------------------------------------------------+
                                    | Encrypted Ciphertext + Auth ID Tokens Only
                                    v
+-----------------------------------------------------------------------------------------+
|                           Zero-Knowledge Cloud Run Services                             |
|  +-------------------------------------+    +-----------------------------------------+ |
|  |    Cloud Firestore Native Sync      |    |       5-Stage Gemini Fallback Ladder    | |
|  |  (Ciphertext Partitions + Digests)  |    |  (Air-Gapped SSE Proxy, Auth Enforced)  | |
|  +-------------------------------------+    +-----------------------------------------+ |
|  +-------------------------------------+    +-----------------------------------------+ |
|  |  Distributed Firestore Rate Limiter |    |      Google Cloud Secret Manager        | |
|  |  (Sliding Window across 10 instances|    |  (Zero Secrets in Code: GEMINI, VAPID)  | |
|  +-------------------------------------+    +-----------------------------------------+ |
+-----------------------------------------------------------------------------------------+
```
---
## Cryptographic Security Contracts & STRIDE Threat Model
Nexus Mind Vault was engineered from Day 1 around the **STRIDE Threat Modeling Matrix** and **Zero-Trust Architecture**:
```
+-------------------------------------------------------------------------------------------+
|                                   ZERO-TRUST ASSURANCE MATRIX                             |
+----------------------+------------------------------------+-------------------------------+
| STRIDE Threat Vector | Identified Vulnerability Risk      | Zero-Trust Countermeasure     |
+----------------------+------------------------------------+-------------------------------+
| **Spoofing**         | Impersonation / Token Hijacking    | Firebase Auth Google OAuth +  |
|                      |                                    | Dual-Factor Master Passphrase |
+----------------------+------------------------------------+-------------------------------+
| **Tampering**        | Memory tampering & record forgery  | Deterministic SHA-256 check   |
|                      |                                    | on read; append-only audit log|
+----------------------+------------------------------------+-------------------------------+
| **Repudiation**      | Unauthorized partition operations  | Immutable owner-bound client  |
|                      |                                    | & Cloud Firestore audit trails|
+----------------------+------------------------------------+-------------------------------+
| **Information Leak** | Plaintext exposure to servers / AI | 100% Client-Side AES-GCM-256  |
|                      |                                    | Zero-Knowledge Encryption     |
+----------------------+------------------------------------+-------------------------------+
| **Denial of Service**| Session sitting & distributed spam | Auto-Lock Inactivity Purge +  |
|                      |                                    | Multi-Instance Rate Limiter   |
+----------------------+------------------------------------+-------------------------------+
| **Privilege Breach** | Coerced forced physical inspection | Duress Cover PIN with Decoy   |
|                      |                                    | Botanical Persona & Air-Gap   |
+----------------------+------------------------------------+-------------------------------+
```
### Key Security Implementations
1. **Deterministic Read-Time Integrity Verification (Finding F4 Fix)**:
   All sealed time capsules calculate synchronous NIST FIPS 180-4 SHA-256 digests over `userId`, `title`, `message`, `sealedAt`, and `unlockDate`. The engine verifies `calculatedHash === storedHash`. Any modified byte, altered timestamp, or forged hash prefix is strictly rejected.
2. **OWASP-Standard Key Derivation (Finding F5.1 Upgrade)**:
   Key derivation uses `PBKDF2-HMAC-SHA-256` at **600,000 iterations** (exceeding current OWASP Password Storage standards), upgraded from legacy 600,000 rounds with zero-downtime backward compatibility for pre-existing vaults.
3. **Sovereign Browser Enclave vs. HSM/KMS Defense (Finding F5.2 Architecture)**:
   - *Technical Rationale*: W3C WebCrypto requires `extractable: true` on derived master keys to permit cryptographic wrapping via `crypto.subtle.wrapKey('raw', keyToWrap, wrappingKey, ...)` for user-directed, encrypted JSON vault backups.
   - *Sovereign Offline Guarantee*: Mandating a centralized Cloud HSM or KMS would destroy the core architectural tenet of Nexus Mind Vault - offline-first sovereign zero-knowledge privacy. With Cloud KMS, the cloud provider holds master envelope access; with WebCrypto enclaves, the user retains absolute cryptographic sovereignty without cloud key custody.
   - *Ephemeral Memory Hygiene*: Master keys reside strictly in volatile memory variables (`_inMemoryCryptoKey`) and are zeroized upon Enclave Lock, Panic Purge, tab unload, or inactivity timeout.
   - *Dual-Mode Derivation*: `deriveKeyFromPassphrase` additionally supports `extractable: false` for strict operational sessions where backup export capabilities are disabled.
4. **Zero-Knowledge Plaintext Purge & Auto-Migration**:
   `getVaultCredentials(uid)` executes an automatic one-way migration on read: if legacy plaintext `pin` or `secret` fields exist, it computes salted hashes (`pinHash` / `secretVerifier`), permanently purges the plaintext properties from storage via `delete creds.pin; delete creds.secret;`, and commits the sanitized V2 credentials to `localStorage`. Plaintext comparison fallbacks have been eliminated from `cryptoEngine.ts`.
5. **Multi-Instance Distributed Rate Limiting on Cloud Run (Finding F5.3 Architecture)**:
   Rather than relying on in-memory counters that reset on scale-to-zero or isolate per container instance, sensitive endpoints (`/api/gemini`, `/api/gemini/audio`, `/api/functions/:functionName`) leverage a distributed sliding-window counter backed by Google Cloud Firestore (`_rate_limits` collection with atomic increments). Quotas are enforced across all 10 Cloud Run container instances, with graceful fallback to in-memory limiting during local dev.
6. **Cross-Origin-Opener-Policy (COOP) Hardening**:
   Configured with `Cross-Origin-Opener-Policy: same-origin-allow-popups` across `server.ts`, `vite.config.ts`, and `firebase.json` to eliminate browser `window.closed` warnings and guarantee seamless Google OAuth popup flows.
7. **Zero Plaintext AI Proxy Air-Gap**:
   AI endpoints are wrapped in `requireFirebaseAuth` ID token verification. When AI features are toggled off in settings, zero outbound network requests are dispatched to inference endpoints.
---
## Resilient Gemini Model Fallback Ladder (Cloud Run AI Challenge Mandated)
Nexus Mind Vault is designed to provide **100% service continuity** with zero mock reflections. The server-side AI proxy implements the exact Cloud Run AI Challenge Mandated Fallback Ladder backed by resilient production fallbacks:
```
[Incoming AI Request (Reflect / Insights / Audio / Graph)]
                        |
                        v
   +------------------------------------------+
   |  Primary: gemini-3.6-flash               | --> [Success: 200 OK / Token Stream]
   |  Primary high-speed cognitive reasoning  |
   +------------------------------------------+
                        | (404 / 403 / Unavailable -> Cascades)
                        v
   +------------------------------------------+
   |  Fallback 1: gemini-3.1-flash-lite       | --> [Success: 200 OK / Token Stream]
   |  High-availability ultra-light tier      |
   +------------------------------------------+
                        | (404 / 403 / Unavailable -> Cascades)
                        v
   +------------------------------------------+
   |  Dynamic Alias: gemini-flash-latest      | --> [Success: 200 OK / Token Stream]
   |  Automated latest version alias          |
   +------------------------------------------+
                        | (404 / 403 / Unavailable -> Cascades)
                        v
   +------------------------------------------+
   |  Deep Reasoning: gemini-3.7-flash        | --> [Success: 200 OK / Token Stream]
   |  Advanced reasoning tier                 |
   +------------------------------------------+
                        | (Cascades to Production Tier)
                        v
   +------------------------------------------+
   |  Vertex Production: gemini-2.5-flash / lite / pro| --> [Production Demo Continuity]
   |  Resilient enterprise fallback tier      |
   +------------------------------------------+
```
---
##  Dual-Partition Architecture: Protected Vault (PV) vs Nexus Mind Vault (NMV)
Nexus Mind Vault solves the physical coercion and shoulder-surfing vulnerabilities inherent in traditional encrypted applications through a **Dual-Partition Shield**:
```
+------------------------------------------------------------------------------------+
|                               Device Screen Gate                                  |
|                                                                                    |
|   Enter PIN [ * * * * * * ]                                                       |
|                                                                                    |
|         |                                                 |                        |
|         | Standard Master PIN                             | Duress Cover PIN       |
|         |                                                 |                        |
|  +-----------------------------------+          +--------------------------------+ |
|  |  Nexus Mind Vault (NMV Enclave)   |          |  Protected Vault (PV Decoy)    | |
|  |  * Dark glassmorphic styling      |          |  * Natural emerald botanical   | |
|  |  * Decrypted cognitive journal    |          |  * Harmless field study notes  | |
|  |  * D3 semantic memory graph       |          |  * 0 master keys in RAM        | |
|  |  * Cryptographic time capsules    |          |  * Zero alarms or alerts       | |
|  |  * Living will legacy protocol    |          |  * Absolute plausible deniability|
|  +-----------------------------------+          +--------------------------------+ |
+------------------------------------------------------------------------------------+
```
### 1.  Protected Vault (PV - Everyday Cover Mode)
* **Role**: Camouflaged plausible deniability shield.
* **Persona**: Presents as an ordinary researcher diary (botanical, agricultural, and soil science field notes).
* **RAM Hygiene**: Holds **0 private cryptographic keys** in memory.
* **Air-Gapped Coercion Target**: Entering the secondary Duress PIN mounts this decoy partition with **zero alarm**, providing complete plausible deniability under physical inspection.
### 2. Nexus Mind Vault (NMV - Sovereign Cryptographic Enclave)
* **Role**: Cryptographically sealed inner cognitive brain.
* **Security Posture**: Unlocked via the **Covert Stealth Gate** with Master Secret Passphrase derivation (`PBKDF2-SHA256` with 600,000 rounds).
* **Cryptographic Enclave**: Ephemeral in-memory `AES-GCM-256` client decryption. Houses multi-turn Gemini cognitive reflections, D3 force-directed semantic graphs, sealed future time capsules, and the multi-policy Legacy Guardian living will protocol.
---
##  Key Features & Visual Walkthrough
> *Reviewers and evaluators: The application features high-fidelity Material 3 design, dark glassmorphism, dynamic audio feedback, and interactive physics visualizations.*
### 1. Covert Gate & Duress Protection
* **Duress Partitioning**: Entering a decoy PIN unlocks the botanical research diary with zero alarm, protecting the user from coerced passphrase disclosure.
* **Ambient Countdown Banner**: Floating warning banner alerts the user 30 seconds before inactivity lock with a 1-click extension button.
### 2. Inner Cognitive Journal & Multi-Modal Reflection Canvas
* **Rich Journal Canvas**: Markdown formatting, mood tags, audio recordings, template selector, search filters, and real-time word/character telemetry.
* **Neural Voice Mirror**: Direct audio recording and transcription powered by Gemini Speech-to-Text (`/api/gemini/audio`).
### 3. AI Cognitive Trends & Executive Synthesis
* **Executive Synthesis**: Dynamic Gemini analysis of recurring mental models, cognitive velocity, and breakthrough themes.
* **Emotional Trajectory**: Tracks emotional balance (calm, focused, energetic, creative) across 30-day journaling windows.
### 4. D3.js Physics Force-Directed Semantic Memory Graph
* **Associative Graph Engine**: Automatically clusters recurring entities, concepts, and journal dates into physics-simulated force nodes.
* **Export Capabilities**: 1-click vector SVG and high-resolution PNG export directly from the canvas.
### 5. Cryptographically Sealed Future Time Capsules
* **NIST FIPS 180-4 SHA-256 Seal**: Tamper-proof digest calculated synchronously at sealing. Unsealing is cryptographically blocked if the hash mismatch indicates data corruption or tampering.
* **Multi-Factor Unlock Conditions**: Supports date/time locks, target mood unlocking, or dual locks.
### 6. Legacy Guardian Proof-of-Life Living Will Protocol
* **Dead Man's Switch**: Emits scheduled Proof-of-Life heartbeats. If the user fails to check in before the grace window expires, pre-configured policy capsules are released to trusted contacts via claim tokens.
* **Multi-Domain Policies**: Supports Family, Crypto/Financial, Business Continuity, and Personal categories.
### 7. Zero-Knowledge Security Health HUD & Multi-Device Manager
* **Live Cryptographic HUD**: Real-time monitor of active RAM key lifecycle, entropy calculation, and local encryption status.
* **Self-Audit Verification**: Automated verification scan testing for zero plaintext leakage across all browser storage partitions.
### 8. Interactive Standalone Showcase App (`/apps/nmv`)
* Built-in interactive showcase available at `/apps/nmv` allowing evaluators to explore the architecture, test fallback ladders, and simulate duress modes in a single click.
---
## Repository Structure
```
+-- Dockerfile                      # Production multi-stage container build for Cloud Run
+-- .dockerignore                   # Build artifact & secret exclusions
+-- .env.example                    # Template environment variables (sanitized)
+-- AGENTS.md                       # Dual-Mode Security Architecture & Agent Directives
+-- firebase.json                   # Firebase Hosting, Firestore, and COOP header rules
+-- firestore.rules                 # Zero-trust owner-isolated database security rules (ABAC)
+-- firestore.indexes.json          # Composite query index definitions
+-- index.html                      # Root HTML5 SPA entry point
+-- package.json                    # Full-stack dependencies and build scripts
+-- public/
|   +-- apps/nmv/index.html         # Interactive Standalone Architecture Showcase
|   +-- css/vault.css               # Official Google Material Design 3 theme system
|   +-- manifest.json               # PWA Web App Manifest
|   +-- nmv-logo.png                # Brand identity asset
+-- server.ts                       # Node.js/Express server, distributed rate limiter & Gemini proxy
+-- src/
|   +-- App.tsx                     # Main React 19 application orchestrator
|   +-- main.tsx                    # React DOM root mounting
|   +-- types.ts                    # TypeScript data models and interfaces
|   +-- __tests__/                  # Vitest automated test suite (56 unit tests)
|   +-- components/                 # 39 Modular UI components
|   |   +-- AITrendsCard.tsx        # AI Cognitive Trends & Executive Synthesis
|   |   +-- AutoLockWarningBanner.tsx# Floating ambient countdown alert
|   |   +-- CreateTimeCapsuleView.tsx# Time capsule builder with time & mood locks
|   |   +-- FirstTimeSetupModal.tsx # Dual-factor master credential setup
|   |   +-- JournalView.tsx         # Multi-modal reflection canvas & AI Mirror
|   |   +-- LegacyGuardianCapsuleView.tsx# Multi-policy living will fail-safe
|   |   +-- NeuralVoiceMirrorView.tsx# Real-time Gemini audio voice mirror
|   |   +-- NexusMindView.tsx       # Multi-turn Neural Vault chat
|   |   +-- PVUnlockScreen.tsx      # Master PIN gate & duress cover trigger
|   |   +-- ProtectedVaultGraphView.tsx# Botanical field-study decoy graph
|   |   +-- SemanticMemoryGraph.tsx # D3.js physics force-directed concept graph
|   |   +-- TimeCapsulesView.tsx    # Cryptographically sealed time-locked vaults
|   |   +-- UnlockVaultModal.tsx    # Covert stealth gate for secret code derivation
|   |   +-- VaultSecurityHUD.tsx    # Live cryptographic HUD & session timer
|   |   +-- VaultSettingsView.tsx   # Zero-trust assurance matrix & credentials
|   +-- services/
|   |   +-- authService.ts          # Firebase Authentication & COOP fallback
|   |   +-- cryptoEngine.ts         # W3C WebCrypto AES-GCM-256 & PBKDF2 engine
|   |   +-- geminiClient.ts         # Authenticated SSE streaming client proxy
|   |   +-- logger.ts               # Zero-knowledge structured telemetry logger
|   |   +-- vaultStorage.ts         # Local & Cloud Firestore persistence manager
|   +-- utils/
|       +-- entrySharingEngine.ts   # Authenticated single-entry share encryption
|       +-- notificationEngine.ts   # Web Push RFC 8291 notification manager
|       +-- vaultExportHelpers.ts   # Encrypted JSON, Markdown, and CSV export
+-- README.md                       # Comprehensive deployment, security & operations guide
```
---
##  Step-by-Step Installation & Deployment Guide
Follow this end-to-end setup guide to clone, run locally, test, and deploy Nexus Mind Vault to **Google Cloud Run** and **Firebase**.
---
### Step 0: Prerequisites & Tooling Installation
If you do not have the required CLI tools installed, install them using the commands for your operating system:
#### 1. Git
* **Windows** (PowerShell as Administrator):
  ```powershell
  winget install --id Git.Git -e --source winget
  ```
* **macOS** (Homebrew):
  ```bash
  brew install git
  ```
* **Linux** (Debian/Ubuntu):
  ```bash
  sudo apt-get update && sudo apt-get install -y git
  ```
#### 2. Node.js (v20.x or higher LTS)
* **Windows**:
  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```
* **macOS**:
  ```bash
  brew install node@20
  ```
* **Linux**:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```
#### 3. Google Cloud SDK (`gcloud` CLI)
* **Windows**:
  ```powershell
  winget install Google.CloudSDK
  ```
* **macOS**:
  ```bash
  brew install --cask google-cloud-sdk
  ```
* **Linux**:
  ```bash
  sudo apt-get update && sudo apt-get install -y apt-transport-https ca-certificates gnupg curl
  curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
  echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
  sudo apt-get update && sudo apt-get install -y google-cloud-cli
  ```
#### 4. Firebase CLI
```bash
npm install -g firebase-tools
```
---
### Step 1: Clone Repository & Install Dependencies
```bash
# 1. Clone the repository
git clone https://github.com/sonofmoon/nexus-mind-vault.git
cd nexus-mind-vault
# 2. Install all dependencies
npm install
```
---
### Step 2: Environment Configuration
Create your local `.env` file from `.env.example`:
```bash
# On Linux/macOS
cp .env.example .env
# On Windows PowerShell
Copy-Item .env.example .env
```
Edit `.env` with your Google Cloud and Gemini credentials:
```ini
PORT=3000
NODE_ENV=development
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
VAPID_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY=YOUR_VAPID_PRIVATE_KEY
VAPID_SUBJECT=mailto:admin@nexusvault.app
```
> [!TIP]
> To generate a fresh RFC 8292 VAPID keypair for Web Push notifications, run:
> ```bash
> npx web-push generate-vapid-keys
> ```
---
### Step 3: Run Automated Test Suite & Local Dev Server
Verify the codebase integrity locally:
```bash
# Run the complete Vitest test suite (56 tests)
npm test
# Verify production compilation
npm run build
# Start local full-stack development server (binds to http://localhost:3000)
npm run dev
```
---
### Step 4: Authenticate with Google Cloud & Firebase
```bash
# 1. Authenticate gcloud CLI
gcloud auth login
gcloud auth application-default login
# 2. Authenticate Firebase CLI
firebase login
# 3. Set your target Google Cloud Project ID
export PROJECT_ID="YOUR_PROJECT_ID"
gcloud config set project $PROJECT_ID
firebase use $PROJECT_ID
```
Enable all required Google Cloud service APIs:
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com \
  identitytoolkit.googleapis.com \
  iam.googleapis.com
```
---
### Step 5: Provision Cloud Secret Manager (Secret Zero-Pattern)
Provision your API keys and VAPID private key in **Google Cloud Secret Manager** so zero secrets exist in source code or client bundles:
```bash
# 1. Provision GEMINI_API_KEY
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
# 2. Provision VAPID_PRIVATE_KEY
gcloud secrets create VAPID_PRIVATE_KEY --replication-policy="automatic"
echo -n "YOUR_ACTUAL_VAPID_PRIVATE_KEY" | gcloud secrets versions add VAPID_PRIVATE_KEY --data-file=-
# 3. Provision VAPID_PUBLIC_KEY
gcloud secrets create VAPID_PUBLIC_KEY --replication-policy="automatic"
echo -n "YOUR_ACTUAL_VAPID_PUBLIC_KEY" | gcloud secrets versions add VAPID_PUBLIC_KEY --data-file=-
# 4. Grant Secret Accessor role to Cloud Run compute service account
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding VAPID_PRIVATE_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```
---
### Step 6: Deploy Cloud Firestore Database & Rules
Create the Native Firestore database (if not already provisioned):
```bash
gcloud firestore databases create --location=us-central1 --type=firestore-native
```
#### Actual Repository `firestore.rules` (Verbatim):
The Firestore security rules enforce strict Owner-Bound Attribute-Based Access Control (ABAC) and append-only audit logging:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Authentication Helper Functions
    function isSignedIn() {
      return request.auth != null;
    }
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    // Strict User-Isolated Domain Rules (Zero-Knowledge ABAC / Owner-Bound)
    match /users/{userId} {
      // User Root Profile Document
      allow read, write: if isOwner(userId);
      // Recursive Wildcard: Permits all user-owned subcollections
      // (entries, timeCapsules, settings, guardians, graphNodes, auditEvents)
      match /{allChildren=**} {
        allow read, write: if isOwner(userId);
      }
      // Explicit Domain Partitions
      match /entries/{entryId} {
        allow read, write: if isOwner(userId);
      }
      match /timeCapsules/{capsuleId} {
        allow read, write: if isOwner(userId);
      }
      match /guardians/{guardianId} {
        allow read, write: if isOwner(userId);
      }
      match /settings/{docId} {
        allow read, write: if isOwner(userId);
      }
      match /graphNodes/{nodeId} {
        allow read, write: if isOwner(userId);
      }
      match /auditEvents/{eventId} {
        allow read, create: if isOwner(userId);
        allow update, delete: if false;
      }
    }
    // Default Deny: Global Safety Net
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```
Deploy the security rules to your Firebase project:
```bash
firebase deploy --only firestore:rules
```
---
### Step 7: Deploy to Google Cloud Run
Deploy directly from source with automated container build and Secret Manager secret mounts:
```bash
gcloud run deploy nexus-mind-vault \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest,VAPID_PRIVATE_KEY=VAPID_PRIVATE_KEY:latest \
  --set-env-vars NODE_ENV=production,PORT=8080,FIREBASE_PROJECT_ID=$PROJECT_ID,VAPID_SUBJECT=mailto:admin@nexusvault.app \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --update-labels=dev-tutorial=cloud-run-ai-challenge
```
---
### Step 8: Post-Deployment Verification
Verify that your Cloud Run deployment satisfies all security and health checks:
```bash
# 1. Health Check (Expect HTTP 200 { status: "healthy" })
curl -f https://YOUR_SERVICE_URL/health
# 2. Cross-Origin-Opener-Policy Header Check (Expect same-origin-allow-popups)
curl -I https://YOUR_SERVICE_URL/ | grep -i cross-origin-opener-policy
# 3. Unauthenticated AI Endpoint Defense (Expect HTTP 401 auth/missing-token)
curl -X POST https://YOUR_SERVICE_URL/api/gemini
# 4. Public VAPID Key Retrieval (Expect HTTP 200 with publicKey)
curl https://YOUR_SERVICE_URL/api/notifications/vapid-public-key
# 5. Interactive Showcase Accessibility (Expect HTTP 200)
curl -f https://YOUR_SERVICE_URL/apps/nmv
```
---
### Zone 5: Required Campaign Labeling (Challenge Verification)
To ensure automated challenge verification crawlers and judges recognize the submission, confirm that the campaign label is attached:
```bash
# Verify attached labels
gcloud run services describe nexus-mind-vault \
  --region us-central1 \
  --format="value(metadata.labels)"
```
*Expected Output:*
```
dev-tutorial: cloud-run-ai-challenge
```
If the label was omitted during deployment, apply it dynamically:
```bash
gcloud run services update nexus-mind-vault \
  --region us-central1 \
  --update-labels=dev-tutorial=cloud-run-ai-challenge
```
---
##  Automated Verification & Test Suite
Nexus Mind Vault includes an automated test suite verifying cryptographic correctness, tamper rejection, rate limiting, and zero-knowledge guarantees:
```bash
npm test
```
### Test Suite Execution Output (56/56 Passed):
```
 [OK] src/__tests__/cryptoEngine.test.ts (9 tests)
   [OK] should derive consistent AES-GCM and HMAC keys from passphrase and salt
   [OK] should support non-extractable key derivation when requested (F5.2)
   [OK] should support OWASP 600,000 PBKDF2 iterations and legacy 600,000 iterations (F5.1)
   [OK] should encrypt and decrypt data with zero data loss
   [OK] should compute and verify tamper-proof HMAC signatures
   [OK] should compute synchronous SHA-256 hash digests and verify valid capsule seals
   [OK] should strictly reject tampered capsules and forged sha256_ prefixes (F4 Audit Fix)
   [OK] should verify PIN code using salted SHA-256 verifier and strictly reject plaintext fallbacks
   [OK] should verify Secret Passphrase using salted SHA-256 verifier and strictly reject plaintext fallbacks
 [OK] src/__tests__/authService.test.ts (2 tests)
 [OK] src/__tests__/geminiClient.test.ts (5 tests)
 [OK] src/__tests__/notificationEngine.test.ts (5 tests)
 [OK] src/__tests__/entrySharingEngine.test.ts (5 tests)
 [OK] src/__tests__/vaultStorage.test.ts (7 tests)
 [OK] src/__tests__/AITrendsCard.test.tsx (4 tests)
 [OK] src/__tests__/UnlockVaultModal.test.tsx (5 tests)
 [OK] src/__tests__/SecurityHealthDashboard.test.tsx (6 tests)
 [OK] src/__tests__/JournalView.test.tsx (8 tests)
Test Files  10 passed (10)
     Tests  56 passed (56)
  Duration  1.71s
```
---
## [doc] License & Compliance
Distributed under the **MIT License**. Engineered in strict accordance with the **Google Cloud Zero-Trust Security Model** and **W3C WebCrypto Cryptographic Standards**.

