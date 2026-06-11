# ANICHISOM OS - Complete Implementation

A self-hosted, flexible creative workspace with **multi-provider authentication** that gives users complete freedom to choose their backend.

## What's Built

### Phase 1-3A: Core ANICHISOM OS Features (Complete)

- **Workspace Management** - Personal, team, client, side-gig workspaces
- **Project Management** - Campaign Lab with full CRUD, deliverables, approvals
- **Real-time Collaboration** - Presence system, file locking, live editing
- **Design Tools** - Moodboard Mill, color palette manager, brand themes
- **AI Features** - Design recommendations via Claude
- **Freelance Platform** - Side-gigs marketplace with time tracking
- **Event History** - Complete audit trail with undo/redo
- **Time Machine** - Browse and restore past workspace states

### Phase 4: Multi-Provider Authentication (Complete)

Users choose their backend:
- **Custom Auth** - PostgreSQL + unique ID (self-hosted)
- **Firebase** - Google-managed (cloud)
- **Supabase** - Open-source Firebase alternative
- **Extensible** - Easy to add more providers

**No code changes needed to switch providers. Just set an environment variable.**

## Quick Start

### 1. Choose Your Auth Provider

#### Custom (Self-Hosted)
```bash
NEXT_PUBLIC_AUTH_PROVIDER=custom
DATABASE_URL=postgresql://user:pass@localhost:5432/anichisom
SESSION_SECRET=generate_random_64_char_key

docker-compose up -d  # Starts PostgreSQL
npm run dev
```

#### Firebase
```bash
NEXT_PUBLIC_AUTH_PROVIDER=firebase
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
# ... other Firebase env vars

npm run dev
```

#### Supabase
```bash
NEXT_PUBLIC_AUTH_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

npm run dev
```

### 2. Login
- **Custom**: Use any unique ID (no password)
- **Firebase**: Click "Sign in with Google"
- **Supabase**: Email/password or OAuth

### 3. Workspace Created
- Automatically create workspaces
- Invite team members
- Start collaborating

## Architecture

### No Vendor Lock-In

```
┌─────────────────┐
│   UI Layer      │ (No changes)
│  (React/Next)   │
└────────┬────────┘
         │
    ┌────▼────────────────────┐
    │  getAuthProvider()       │
    │  (Factory Pattern)       │
    └────┬─────────────────────┘
         │
    ┌────▼──────────────────────┐
    │  AuthProvider Interface   │
    ├──────────────────────────┤
    │ CustomAuthProvider        │
    │ FirebaseAuthProvider      │
    │ SupabaseAuthProvider      │
    │ (Add more easily)         │
    └───────────────────────────┘
```

### Switching Providers

Change one environment variable:
```bash
# From Custom to Firebase
NEXT_PUBLIC_AUTH_PROVIDER=firebase
npm run dev
```

**That's it.** No code changes. Same UI. Complete user data migration handled automatically.

## Project Structure

```
lib/
├── auth-providers/
│   ├── auth-provider.ts           # Interface all backends implement
│   ├── provider-factory.ts        # Factory pattern
│   ├── custom-provider.ts         # PostgreSQL implementation
│   ├── firebase-provider.ts       # Firebase implementation
│   └── supabase-provider.ts       # Supabase implementation
├── workspace-types.ts             # All data type definitions
├── sync-queue.ts                  # Event queueing
├── presence-manager.ts            # Real-time presence
├── file-lock-manager.ts           # Prevent edit conflicts
├── event-history-manager.ts       # Audit trail
└── postgres-adapter.ts            # PostgreSQL CRUD

app/
├── api/
│   └── auth/                      # Auth endpoints
│       ├── login
│       ├── logout
│       └── session
└── page.tsx                       # Main app

components/
├── login-screen.tsx               # Login UI (same for all providers)
├── workspace-selector.tsx         # Switch workspaces
├── campaign-dashboard.tsx         # Project management
├── enhanced-moodboard-mill.tsx    # Design inspiration
├── side-gigs-marketplace.tsx      # Freelance platform
└── ... (20+ more)
```

## Configuration

### .env.local

See `.env.example` for complete reference. Key variables:

```bash
# Auth Provider (required)
NEXT_PUBLIC_AUTH_PROVIDER=custom|firebase|supabase

# Custom Auth
DATABASE_URL=postgresql://...
SESSION_SECRET=...

# Firebase
NEXT_PUBLIC_FIREBASE_*=...

# Supabase
NEXT_PUBLIC_SUPABASE_*=...
```

### Docker Compose

Start PostgreSQL for custom auth:
```bash
docker-compose up -d

# Includes:
# - PostgreSQL 15 (database)
# - pgAdmin (optional UI management)
```

## Features by Provider

| Feature | Custom | Firebase | Supabase |
|---------|--------|----------|----------|
| Self-hosted | ✅ | ❌ | ❌ |
| Cost | Free | Pay-as-you-go | Free tier |
| Auth type | Unique ID | Google Sign-In | Email + OAuth |
| Database | PostgreSQL | Firestore | PostgreSQL |
| Real-time | WebSocket | Firebase | PostgreSQL |
| Scaling | Manual | Auto | Auto |
| Setup time | Medium | Short | Medium |
| Team-friendly | ✅ | ✅ | ✅ |

## Documentation

- **`AUTH_PROVIDER_GUIDE.md`** - Complete auth provider setup and switching guide
- **`MULTI_PROVIDER_AUTH.md`** - Architecture and implementation details
- **`CUSTOM_AUTH_IMPLEMENTATION.md`** - Custom auth technical details
- **`DEGOOGLING_COMPLETE.md`** - Self-hosting and privacy guide

## Security

✅ Parameterized SQL queries (Custom)  
✅ HTTP-only, secure cookies  
✅ 64-char random tokens  
✅ Database-level constraints  
✅ Complete audit trail  
✅ No plaintext passwords  
✅ Input validation  
✅ Proper error handling  

## Production Deployment

### Custom (Self-Hosted)
```bash
# Use managed PostgreSQL (AWS RDS, DigitalOcean, Heroku)
# Set DATABASE_URL to managed instance
# Deploy Next.js to Vercel, Railway, Heroku, etc.
# All data stays in your control
```

### Firebase
```bash
# Create Firebase project
# Set NEXT_PUBLIC_FIREBASE_* env vars
# Deploy to Vercel (automatic)
# Data in Google Cloud
```

### Supabase
```bash
# Create Supabase project
# Set NEXT_PUBLIC_SUPABASE_* env vars
# Deploy to Vercel
# Data in Supabase (EU/US regions available)
```

## Adding a New Provider

1. Create `lib/auth-providers/myprovider-provider.ts`
2. Implement `AuthProvider` interface
3. Add to factory in `provider-factory.ts`
4. Document in `AUTH_PROVIDER_GUIDE.md`
5. Test: `NEXT_PUBLIC_AUTH_PROVIDER=myprovider`

See `AUTH_PROVIDER_GUIDE.md` for detailed example.

## Philosophy

**User freedom is paramount.**

- No vendor lock-in
- Switch providers anytime
- Same experience everywhere
- Easy to extend
- Community contributions welcome

Your infrastructure. Your choice.

## Support

- Check `AUTH_PROVIDER_GUIDE.md` for setup help
- Review existing provider implementations for reference
- Test locally before production
- Share improvements with community

---

**ANICHISOM OS: Freedom in Creative Collaboration**
