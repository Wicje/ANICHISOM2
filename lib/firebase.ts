import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, setLogLevel, onSnapshot, limit } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Silence firestore warnings about offline mode
setLogLevel('silent');

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  signOut,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  limit
};

const provider = new GoogleAuthProvider();
// Request Workspace Drive scope
provider.addScope('https://www.googleapis.com/auth/drive');

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory.
let cachedAccessToken: string | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    if (error?.code === 'auth/popup-blocked') {
      alert('Sign-in popup was blocked by the browser. Please use the "Open in new tab" button at the top right of the preview window to sign in.');
    } else if (error?.code === 'auth/unauthorized-domain') {
       const currentDomain = window.location.hostname;
       alert(`Domain not authorized for sign-in. Please add '${currentDomain}' to your Firebase project's Authorized Domains:\n\n1. Go to Firebase Console -> Authentication -> Settings -> Authorized Domains\n2. Add domain: ${currentDomain}`);
    } else {
      alert(`Sign in error: ${error?.message || error}`);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
