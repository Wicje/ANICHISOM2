# ANICHISOM OS - Phase 5A: Self-Hosting Guide

This guide covers setting up ANICHISOM OS for completely isolated, self-hosted deployment using **Supabase** (PostgreSQL + Auth + Realtime) and **MinIO** (S3-compatible file storage).

## 1. Prerequisites

- Docker and Docker Compose
- Node.js 20+

## 2. Setting up Supabase

We recommend using the official Supabase Docker setup to get the full suite of features (Auth, Realtime, PostgREST).

1. Clone the Supabase docker repository:
   ```bash
   git clone --depth 1 https://github.com/supabase/supabase
   cd supabase/docker
   cp .env.example .env
   ```
2. Start Supabase:
   ```bash
   docker-compose up -d
   ```
3. Once running, you will get an API URL and Anon Key.
4. Run the schema initialization script found in `supabase/schema.sql` against your new Supabase PostgreSQL instance using any database client (e.g., pgAdmin, DBeaver) or via Supabase Studio.

## 3. Configure ANICHISOM OS

Copy `.env.example` to `.env.local` and configure your keys:

```bash
NEXT_PUBLIC_AUTH_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=http://<your-ip>:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=password
MINIO_BUCKET_NAME=anichisom-os-files
```

## 4. Run the Application with MinIO

Start ANICHISOM OS and MinIO using the provided self-hosted docker-compose file:

```bash
docker-compose -f docker-compose.self-hosted.yml up -d
```

This will spin up:
- **MinIO**: Object storage accessible at `http://localhost:9001` (Console) and `http://localhost:9000` (API).
- **Redis**: For fast state management and caching.
- **ANICHISOM OS**: The main application on `http://localhost:3000`.

## 5. Migrating from Firestore

If you have existing data in Firebase/Firestore and want to migrate to your new self-hosted Supabase instance:

1. Obtain a Firebase Service Account Key from your Firebase Console.
2. Save it to the root of the project as `firebase-service-account.json`.
3. Install the required migration dependencies:
   ```bash
   npm install firebase-admin @supabase/supabase-js dotenv
   npm install -g tsx
   ```
4. Run the migration script:
   ```bash
   tsx scripts/firestore-migration.ts
   ```
This script will read your workspaces, projects, files, events, and presence data, and insert them into your Supabase database in batches of 100.

## 6. Storage Adapter Architecture

ANICHISOM OS dynamically selects its storage adapter. With `NEXT_PUBLIC_AUTH_PROVIDER=supabase`, you must import and use `supabase-adapter.ts` for operations that previously used `firestore-adapter.ts`. File operations will be routed through `minio-adapter.ts` securely.
