import { UserSession } from "../types";
import { auth } from "./firebaseConfig";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged
} from "firebase/auth";

const LOCAL_STORAGE_USER_KEY = "vault_journal_session_user";

export function getStoredUserSession(): UserSession | null {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function initAuthListener(onUserChanged: (user: UserSession | null) => void): () => void {
  try {
    // Process redirect result if returning from signInWithRedirect fallback
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        const user = result.user;
        const userSession: UserSession = {
          uid: user.uid,
          email: user.email || "user@gmail.com",
          displayName: user.displayName || user.email?.split("@")[0] || "Vault User",
          photoURL: user.photoURL || undefined
        };
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(userSession));
        onUserChanged(userSession);
      }
    }).catch((err) => {
      console.warn("[Auth Redirect Result Check]", err);
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userSession: UserSession = {
          uid: user.uid,
          email: user.email || "user@gmail.com",
          displayName: user.displayName || user.email?.split("@")[0] || "Vault User",
          photoURL: user.photoURL || undefined
        };
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(userSession));
        onUserChanged(userSession);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
        onUserChanged(null);
      }
    }, (error) => {
      console.error("[Auth Listener Error]", error);
      onUserChanged(null);
    });
    return unsubscribe;
  } catch (err) {
    console.error("[Firebase Auth Init Error]", err);
    onUserChanged(null);
    return () => {};
  }
}

export async function signInWithGoogle(): Promise<UserSession> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const userSession: UserSession = {
      uid: user.uid,
      email: user.email || "user@gmail.com",
      displayName: user.displayName || user.email?.split("@")[0] || "Vault User",
      photoURL: user.photoURL || undefined
    };
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(userSession));
    return userSession;
  } catch (error: any) {
    console.error("[Google Sign-In Error]", error);
    const errorCode = error.code || "unknown";

    // Resilient fallback: If browser blocks popups, redirect to Google Sign-In
    if (errorCode === "auth/popup-blocked" || errorCode === "auth/cancelled-popup-request") {
      console.warn("[Google Sign-In] Popup was blocked by browser. Falling back to signInWithRedirect...");
      await signInWithRedirect(auth, provider);
      return new Promise(() => {}); // Pauses until browser navigates
    }

    if (errorCode === "auth/unauthorized-domain") {
      throw new Error(`Domain '${window.location.hostname}' is not authorized in Firebase Console -> Authentication -> Settings -> Authorized Domains. Please add '${window.location.hostname}'.`);
    }
    if (errorCode === "auth/popup-closed-by-user") {
      throw new Error("Google Sign-in popup was closed before completing.");
    }
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch (err) {
    console.error("[Sign Out Error]", err);
  }
  localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
}
