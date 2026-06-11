# ANICHISOM OS - Auth Provider Guide

**Freedom of Choice: Pick Your Backend**

ANICHISOM OS supports multiple authentication backends. Users can choose based on their needs:
- **Custom**: Self-hosted PostgreSQL with unique ID authentication
- **Firebase**: Google Cloud Firebase for managed authentication
- **Supabase**: Open-source Firebase alternative with PostgreSQL
- **Easy to add more**: Implement the AuthProvider interface to add any backend

## Quick Start by Provider

### Option 1: Custom (Self-Hosted PostgreSQL)

Best for: Complete control, self-hosted deployments, privacy-focused

```bash
# .env.local
NEXT_PUBLIC_AUTH_PROVIDER=custom
DATABASE_URL=postgresql://user:pass@localhost:5432/anichisom
SESSION_SECRET=your_64_char_random_key

# Start database
docker-compose up -d

# Login with any unique ID (no password)
```

### Option 2: Firebase

Best for: Quick setup, managed auth, Google integration

```bash
# .env.local
NEXT_PUBLIC_AUTH_PROVIDER=firebase
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx

# Login with Google Sign-In
```

### Option 3: Supabase

Best for: Open-source, PostgreSQL with managed auth, good middle ground

```bash
# .env.local
NEXT_PUBLIC_AUTH_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Login with email/password or OAuth
```

## How It Works

### Architecture

```
os-context.tsx (No changes)
    ↓
getAuthProvider() (Factory)
    ↓
┌─────────────────────────────┐
│   AuthProvider Interface    │
├─────────────────────────────┤
│  CustomAuthProvider         │
│  FirebaseAuthProvider       │
│  SupabaseAuthProvider       │
└─────────────────────────────┘
```

### Key Files

- `lib/auth-providers/auth-provider.ts` - Abstract interface all providers implement
- `lib/auth-providers/provider-factory.ts` - Factory that instantiates the correct provider
- `lib/auth-providers/custom-provider.ts` - PostgreSQL implementation
- `lib/auth-providers/firebase-provider.ts` - Firebase implementation
- `lib/auth-providers/supabase-provider.ts` - Supabase implementation

### Supported Methods

All providers implement these methods:

```typescript
interface AuthProvider {
  getCurrentUser(): Promise<AuthUser | null>;
  login(credentials: Record<string, any>): Promise<AuthSession>;
  logout(): Promise<void>;
  isSessionValid(): Promise<boolean>;
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
  createUser?(data: Record<string, any>): Promise<AuthUser>;
  updateUser?(userId: string, data: Record<string, any>): Promise<AuthUser>;
}
```

## Adding a New Provider

### Step 1: Implement the Interface

```typescript
// lib/auth-providers/my-provider.ts
import { AuthProvider, AuthUser, AuthSession } from './auth-provider';

export class MyAuthProvider implements AuthProvider {
  async getCurrentUser(): Promise<AuthUser | null> {
    // Your implementation
  }

  async login(credentials: Record<string, any>): Promise<AuthSession> {
    // Your implementation
  }

  async logout(): Promise<void> {
    // Your implementation
  }

  async isSessionValid(): Promise<boolean> {
    // Your implementation
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    // Your implementation
    return () => {}; // Unsubscribe function
  }
}
```

### Step 2: Add to Factory

```typescript
// lib/auth-providers/provider-factory.ts
case 'my-provider':
  cachedProvider = new MyAuthProvider();
  break;
```

### Step 3: Use It

```bash
# .env.local
NEXT_PUBLIC_AUTH_PROVIDER=my-provider
```

That's it! No UI changes needed. The entire app works with your new provider.

## No Vendor Lock-In

The design ensures:

✅ **Switch anytime**: Change one environment variable  
✅ **Same UI**: All providers work with identical frontend  
✅ **User choice**: Developers choose what works for them  
✅ **Easy migration**: Implement AuthProvider, add to factory  
✅ **Community**: Others can contribute new providers  

## Provider Comparison

| Feature | Custom | Firebase | Supabase |
|---------|--------|----------|----------|
| Self-hosted | ✅ | ❌ | ❌ |
| PostgreSQL | ✅ | ❌ | ✅ |
| Zero dependencies | ✅ | ❌ | ❌ |
| Managed service | ❌ | ✅ | ✅ |
| OAuth support | ⚠️ Limited | ✅ Full | ✅ Full |
| Cost | $0 | Pay-as-you-go | Free tier |
| Setup time | Medium | Fast | Medium |

## Environment Variable Reference

```bash
# Required for all
NEXT_PUBLIC_AUTH_PROVIDER=custom|firebase|supabase

# Custom only
DATABASE_URL=postgresql://...
SESSION_SECRET=...
SESSION_COOKIE_SECURE=true/false
SESSION_COOKIE_MAX_AGE=2592000

# Firebase only
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Supabase only
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Migration Guide

### Firebase → Custom

1. Export Firebase user data
2. Set `NEXT_PUBLIC_AUTH_PROVIDER=custom`
3. Migrate user data to PostgreSQL
4. Restart app

### Custom → Supabase

1. Set `NEXT_PUBLIC_AUTH_PROVIDER=supabase`
2. Configure Supabase env vars
3. Migrate data to Supabase
4. Restart app

Same process for any provider swap.

## Support

Need help implementing a new provider?

1. Check the AuthProvider interface
2. Look at existing implementations for reference
3. Test with the factory before deploying
4. Share with community!

**Your infrastructure, your choice.**
