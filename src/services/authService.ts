import { UserSession } from "../types";
import { auth } from "./firebaseConfig";
import { GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from "firebase/auth";

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

    if (errorCode === "auth/unauthorized-domain") {
      throw new Error(`Domain '${window.location.hostname}' is not authorized in Firebase Console -> Authentication -> Settings -> Authorized Domains. Please add 'localhost' or '${window.location.hostname}'.`);
    }
    if (errorCode === "auth/popup-closed-by-user") {
      throw new Error("Google Sign-in popup was closed before completing.");
    }
    if (errorCode === "auth/popup-blocked") {
      throw new Error("Google Sign-in popup was blocked by browser. Please allow popups for localhost.");
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
