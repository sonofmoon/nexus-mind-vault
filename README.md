# 🔒 Nexus Mind Vault (NMV) — Personal Gemini Journal
### 🏆 Cohort 3 • Accelerate AI with Cloud Run • Gen AI Academy APAC Edition
**Ideathon Challenge Submission | `#AccelerateAIwithCloudRun`**

**Nexus Mind Vault (NMV)** is an enterprise-grade, zero-trust personal cognitive journaling and semantic memory platform. Built with **Firebase Authentication**, **Cloud Firestore**, **Google Cloud Secret Manager**, and **Google Cloud Run**, it integrates **Google Gemini Models** (`@google/genai`) to deliver cognitive reflection, multi-modal insight extraction, and cryptographic privacy.

---

## 🛡️ Dual-Mode Security Architecture & STRIDE Threat Model

Nexus Mind Vault operates under a **Dual-Mode Security Architecture (Builder + Red-Teamer)**, ensuring cryptographic isolation, plausible deniability, and strict zero-trust boundaries:

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ZERO-TRUST ARCHITECTURE                                 │
├──────────────────────┬────────────────────────────────────┬───────────────────────────────┤
│ STRIDE Threat Vector │ Identified Vulnerability Risk      │ Zero-Trust Countermeasure     │
├──────────────────────┼────────────────────────────────────┼───────────────────────────────┤
│ **Spoofing**         │ Impersonation / Token Spoofing     │ Firebase Auth Google OAuth +  │
│                      │                                    │ Dual-Factor PBKDF2 Master Key │
├──────────────────────┼────────────────────────────────────┼───────────────────────────────┤
│ **Tampering**        │ Memory tampering & record forgery  │ SHA-256 Checksums on all logs │
│                      │                                    │ & Append-only Firestore Audit │
├──────────────────────┼────────────────────────────────────┼───────────────────────────────┤
│ **Repudiation**      │ Unauthorized partition operations  │ Immutable client & cloud audit│
│                      │                                    │ log streams for all auth events│
├──────────────────────┼────────────────────────────────────┼───────────────────────────────┤
│ **Information Leak** │ Plaintext exposure to servers / AI │ 100% Client-side AES-GCM-256  │
│                      │                                    │ Zero-Knowledge Encryption     │
├──────────────────────┼────────────────────────────────────┼───────────────────────────────┤
│ **Denial of Service**│ Inactivity hijacking / session sit │ Dynamic Auto-Lock Inactivity  │
│                      │                                    │ Purge with 30s Ambient Alerts │
├──────────────────────┼────────────────────────────────────┼───────────────────────────────┤
│ **Privilege Breach** │ Coerced forced physical unlocking  │ Duress Cover PIN with Decoy   │
│                      │                                    │ Parallel Persona & Air-Gap    │
└──────────────────────┴────────────────────────────────────┴───────────────────────────────┘
```

---

## 🏰 The Dual-Partition Architecture: Protected Vault (PV) vs Nexus Mind Vault (NMV)

Nexus Mind Vault introduces a breakthrough **Dual-Partition Paradigm**, solving the physical coercion and shoulder-surfing vulnerabilities inherent in traditional encrypted applications:

### 1. 🍃 Protected Vault (PV - Everyday Cover Mode)
* **Role**: Camouflaged, plausible deniability shield.
* **Security Posture**: Functions as an ordinary research reflection diary (e.g. botanical & agricultural field notes).
* **RAM Hygiene**: Holds **0 private cryptographic keys** in memory. If a bystander looks over your shoulder or demands to inspect your device, only harmless public reflections are visible.
* **Air-Gapped Coercion Target**: Entering the secondary Duress PIN mounts this decoy partition with **zero alarm**, providing complete plausible deniability.

### 2. 🔒 Nexus Mind Vault (NMV - Sovereign Cryptographic Enclave)
* **Role**: Cryptographically sealed inner cognitive brain.
* **Security Posture**: Unlocked via the **Covert Stealth Gate** with Master Secret Passphrase derivation (`PBKDF2-SHA256` with 100,000 iterations).
* **Cryptographic Enclave**: Ephemeral in-memory `AES-GCM-256` client decryption. Houses multi-turn Gemini 3.6/3.7 Flash cognitive reflections, D3 force-directed semantic memory graphs, sealed future time capsules, and the multi-policy Legacy Guardian living will protocol.

---

## 📁 Repository Structure

```
├── Dockerfile                      # Production multi-stage container build for Cloud Run
├── .dockerignore                   # Build artifact & secret exclusions
├── firebase.json                   # Firebase Hosting and Firestore configuration
├── firestore.rules                 # Zero-trust owner-isolated database security rules
├── firestore.indexes.json          # Composite query index definitions
├── index.html                      # Root HTML5 SPA entry point
├── metadata.json                   # Google AI Studio application metadata
├── package.json                    # Full-stack dependencies and build scripts
├── public/
│   ├── css/vault.css               # Official Google Material Design 3 theme system
│   └── nmv-logo.png                # Nexus Mind Vault brand asset
├── server.ts                       # Production Node.js/Express server & Gemini API proxy
├── src/
│   ├── App.tsx                     # Main React 19 application orchestrator
│   ├── main.tsx                    # React DOM root mounting
│   ├── types.ts                    # TypeScript data models and interfaces
│   ├── components/                 # 22 Modular Google Material 3 UI components
│   │   ├── AutoLockWarningBanner.tsx   # Floating ambient countdown alert
│   │   ├── FirstTimeSetupModal.tsx     # Dual-factor master credential setup
│   │   ├── JournalView.tsx             # Multi-modal entry canvas & AI Mirror
│   │   ├── LegacyGuardianCapsuleView.tsx# Multi-policy living will fail-safe
│   │   ├── NexusMindView.tsx           # Semantic memory web & Neural Vault chat
│   │   ├── UnlockVaultModal.tsx        # Secret gate & duress PIN unlocker
│   │   ├── VaultSecurityHUD.tsx        # Live cryptographic HUD & session timer
│   │   └── VaultSettingsView.tsx       # Zero-trust assurance matrix & credentials
│   ├── services/                   # Firebase Auth, Config, and Vault Storage
│   └── utils/                      # D3 Graph Extractor & Web Audio Synthesizer
└── README.md                       # Comprehensive deployment, security & operations guide
```

---

## ⚡ Deployment & Configuration Zones (Step-by-Step)

Follow the structured deployment workflow below to configure, secure, and deploy Nexus Mind Vault to **Google Cloud Run**.

---

### Zone 1: Environment & Prerequisites

#### 1.1 Install Command-Line Tools
* **Google Cloud SDK (`gcloud` CLI)**: [Install Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
* **Firebase CLI**:
  ```bash
  npm install -g firebase-tools
  ```
* **Node.js**: Version 20.x or higher

#### 1.2 Authenticate & Set Active GCP Project
```bash
# Log in to Google Cloud
gcloud auth login
gcloud auth application-default login

# Log in to Firebase CLI
firebase login

# Set your target Google Cloud Project ID
export PROJECT_ID="YOUR_PROJECT_ID"
gcloud config set project $PROJECT_ID
firebase use $PROJECT_ID
```

#### 1.3 Enable Required Google Cloud APIs
Enable the foundational cloud service APIs required for Cloud Run, Secret Manager, Cloud Build, and Cloud Firestore:
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

### Zone 2: Secret Management Setup (Secret Zero-Pattern)

To adhere strictly to the **Secret Zero-Pattern**, no API keys or private credentials reside in client-side bundles or source control. The Gemini API key is securely provisioned in **Google Cloud Secret Manager** and mounted directly into the Cloud Run execution environment.

#### 2.1 Create the Secret in Secret Manager
```bash
# Create the secret definition
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Add your Gemini API Key as the latest secret version
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

#### 2.2 Grant Cloud Run Service Account Secret Accessor Privileges
Retrieve your Google Cloud Project Number and grant the compute service account the `Secret Manager Secret Accessor` role:
```bash
# Retrieve Project Number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# Grant Secret Accessor IAM role to Cloud Run runtime service account
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### Zone 3: Database Security Configuration (Cloud Firestore)

Nexus Mind Vault uses **Cloud Firestore** in Native Mode with **Rules as Code** to guarantee that user data is isolated per authenticated user ID (`request.auth.uid`).

#### 3.1 Provision Firestore Database (if not already provisioned)
```bash
gcloud firestore databases create --location=us-central1 --type=firestore-native
```

#### 3.2 Review Zero-Trust Firestore Security Rules (`firestore.rules`)
All documents are partitioned under `/users/{userId}`. Global safety net enforces **Default Deny**:
```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Default Deny Global Safety Net
    match /{document=**} {
      allow read, write: if false;
    }

    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // Strict User-Isolated Domain Rules
    match /users/{userId} {
      allow read, write: if isOwner(userId);

      // Multi-Turn Journal Sessions & Messages
      match /sessions/{sessionId} {
        allow read, write: if isOwner(userId);

        match /messages/{messageId} {
          allow read, write: if isOwner(userId);
        }
      }

      // Tamper-Evident Audit Timeline (Append-only by owner, immutable)
      match /auditEvents/{eventId} {
        allow read, create: if isOwner(userId);
        allow update, delete: if false;
      }

      // Sealed Future Capsules & Time-Locks
      match /timeCapsules/{capsuleId} {
        allow read, write: if isOwner(userId);
      }
    }
  }
}
```

#### 3.3 Deploy Firestore Security Rules
```bash
firebase deploy --only firestore:rules
```

---

### Zone 4: Google Cloud Run Deployment Flow

The application includes a production-ready, multi-stage `Dockerfile` optimizing bundle size, security nonces, and execution latency.

#### 4.1 Build and Deploy to Cloud Run
Deploy the application directly from source using the pre-formatted `gcloud run deploy` command:

```bash
gcloud run deploy nexus-mind-vault \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-env-vars NODE_ENV=production,PORT=8080 \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --update-labels=dev-tutorial=cloud-run-ai-challenge
```

> [!IMPORTANT]
> The `--set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest` flag securely injects the API key from Google Cloud Secret Manager into the server environment at runtime without exposing it to client bundles or build artifacts.

---

### Zone 5: Required Campaign Labeling (Challenge Verification)

To ensure automated verification systems and campaign evaluators recognize the deployed service, the mandatory challenge resource label must be attached to the Cloud Run service.

#### 5.1 Verify or Apply Campaign Resource Label
If you deployed without the label flag or wish to apply it to an existing service:
```bash
gcloud run services update nexus-mind-vault \
  --region us-central1 \
  --update-labels=dev-tutorial=cloud-run-ai-challenge
```

#### 5.2 Confirm Attached Labels
```bash
gcloud run services describe nexus-mind-vault \
  --region us-central1 \
  --format="value(metadata.labels)"
```
*Expected Output:*
```
dev-tutorial: cloud-run-ai-challenge
```

---

## 🧪 Comprehensive Verification & Security Testing Checklist

- [x] **Firebase Authentication**: Users sign in via Google OAuth popup; session tokens verified before database mounts.
- [x] **Multi-Turn Gemini API Interaction**: Conversational turns and memory context arrays are passed to Gemini models with local heuristic fallbacks.
- [x] **User-Isolated Firestore Storage**: All database read/write actions are constrained to `/users/{userId}/...` via `firestore.rules`.
- [x] **Secret Zero-Pattern**: `GEMINI_API_KEY` is loaded exclusively via Cloud Secret Manager; zero API keys reside in front-end code.
- [x] **Zero XSS & Hostile Input Defense**: Static analysis confirms 0 instances of `dangerouslySetInnerHTML`, `eval()`, or `innerHTML`.
- [x] **Anti-Coercion Duress Mode**: Duress PIN seamlessly mounts an air-gapped Decoy Persona with plausible deniability.
- [x] **Synchronized Inactivity Auto-Lock**: Real-time timer with floating 30-second warning banner and 1-click extension.
- [x] **Multi-Policy Legacy Guardian**: Automated emergency fail-safe with live Proof-of-Life heartbeats and simulation handover.

---

## 📄 License & Compliance

Distributed under the **MIT License**. Engineered in strict accordance with **Google Cloud Zero-Trust & Secret Zero-Pattern Architectures**.
