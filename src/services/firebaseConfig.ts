import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

/**
 * Firebase Client Configuration
 * Resolves credentials dynamically via import.meta.env runtime injection.
 */
export const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyAkPuAjliHFhGiEzoP6_99Tu0hCST4SPX4",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "neural-vault-22e16.firebaseapp.com",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "neural-vault-22e16",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "neural-vault-22e16.firebasestorage.app",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "245629322618",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:245629322618:web:b28cfc6a847256b21082c3",
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || "G-BEEQPP4Y3Y"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
