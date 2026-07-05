import { AuthProvider, AuthUser, AuthSession } from './auth-provider';

/**
 * Firebase Auth Provider
 * 
 * For users who prefer Google Firebase for authentication.
 * Supports Google Sign-In, email/password, and other Firebase methods.
 */
export class FirebaseAuthProvider implements AuthProvider {
  private auth: any;
  private db: any;

  constructor() {
    // Lazy-load Firebase to avoid errors if not configured
    try {
      const { auth, db } = require('../firebase');
      this.auth = auth;
      this.db = db;
    } catch {
      // If Firebase is the explicitly chosen auth provider, this is a fatal misconfiguration.
      if (process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'firebase') {
        throw new Error(
          'Firebase is configured as the auth provider (NEXT_PUBLIC_AUTH_PROVIDER=firebase) '
          + 'but firebase-config could not be loaded. Ensure NEXT_PUBLIC_FIREBASE_* env vars are set.'
        );
      }
      console.warn('Firebase not configured. Using Firebase provider requires NEXT_PUBLIC_FIREBASE_* env vars');
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return new Promise((resolve) => {
      if (!this.auth) {
        resolve(null);
        return;
      }

      const { onAuthStateChanged } = require('firebase/auth');
      const unsubscribe = onAuthStateChanged(this.auth, (user: any) => {
        unsubscribe();
        if (user) {
          resolve({
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'User',
            email: user.email,
            avatarUrl: user.photoURL || undefined,
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  async login(credentials: Record<string, any>): Promise<AuthSession> {
    if (!this.auth) {
      throw new Error('Firebase not configured');
    }

    const { signInWithPopup, GoogleAuthProvider } = require('firebase/auth');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(this.auth, provider);
    const user = result.user;

    return {
      user: {
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'User',
        email: user.email,
        avatarUrl: user.photoURL || undefined,
      },
      token: await user.getIdToken(),
    };
  }

  async logout(): Promise<void> {
    if (!this.auth) return;
    const { signOut } = require('firebase/auth');
    await signOut(this.auth);
  }

  async isSessionValid(): Promise<boolean> {
    // Use auth.currentUser directly to avoid registering a new onAuthStateChanged listener
    return this.auth?.currentUser !== null && this.auth?.currentUser !== undefined;
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    if (!this.auth) {
      return () => {};
    }

    const { onAuthStateChanged: fbOnAuthStateChanged } = require('firebase/auth');
    return fbOnAuthStateChanged(this.auth, async (fbUser: any) => {
      if (fbUser) {
        callback({
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          email: fbUser.email,
          avatarUrl: fbUser.photoURL || undefined,
        });
      } else {
        callback(null);
      }
    });
  }
}
