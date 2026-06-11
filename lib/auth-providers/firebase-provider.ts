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
      const { auth, db } = require('./firebase-config');
      this.auth = auth;
      this.db = db;
    } catch {
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
      onAuthStateChanged(this.auth, async (user: any) => {
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
    const user = await this.getCurrentUser();
    return user !== null;
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
