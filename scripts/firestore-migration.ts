import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '../.env.local' });

// Ensure firebase-admin is available or throw helpful error
try {
  require.resolve('firebase-admin');
} catch (e) {
  console.error("Please install firebase-admin: npm install firebase-admin");
  process.exit(1);
}

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '../firebase-service-account.json';
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Service account key not found at ${serviceAccountPath}.`);
  console.error("Please export your Firebase Admin SDK service account key and save it here.");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateCollection(collectionName: string, supabaseTableName: string, transform: (doc: any) => any) {
  console.log(`Migrating ${collectionName} to ${supabaseTableName}...`);
  const snapshot = await db.collection(collectionName).get();
  
  const records = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    data.id = doc.id; // Make sure ID is preserved
    records.push(transform(data));
  }

  if (records.length === 0) {
    console.log(`No records found in ${collectionName}`);
    return;
  }

  // Insert in batches of 100
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    const { error } = await supabase.from(supabaseTableName).upsert(batch);
    if (error) {
      console.error(`Error inserting batch into ${supabaseTableName}:`, error);
    } else {
      console.log(`Inserted ${batch.length} records into ${supabaseTableName}`);
    }
  }
}

async function runMigration() {
  console.log('Starting migration from Firestore to Supabase...');

  await migrateCollection('workspaces', 'workspaces', (data) => ({
    id: data.id,
    name: data.name,
    owner_id: data.ownerId,
    members: data.members || [],
    settings: data.settings || {},
    created_at: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
    updated_at: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
  }));

  await migrateCollection('projects', 'projects', (data) => ({
    id: data.id,
    workspace_id: data.workspaceId,
    name: data.name,
    description: data.description,
    status: data.status,
    timeline: data.timeline || {},
    deliverables: data.deliverables || [],
    created_at: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
    updated_at: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
  }));

  await migrateCollection('files', 'files', (data) => ({
    id: data.id,
    project_id: data.projectId,
    name: data.name,
    type: data.type,
    url: data.url,
    locked_by: data.lockedBy || null,
    created_at: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
    updated_at: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
  }));

  await migrateCollection('events', 'events', (data) => ({
    id: data.id,
    workspace_id: data.workspaceId,
    entity_id: data.entityId,
    entity_type: data.entityType,
    type: data.type,
    actor_id: data.actorId,
    payload: data.payload || {},
    timestamp: data.timestamp?.toDate().toISOString() || new Date().toISOString(),
  }));

  await migrateCollection('presence', 'presence', (data) => ({
    id: data.id,
    user_id: data.userId,
    workspace_id: data.workspaceId,
    is_online: data.isOnline || false,
    current_app: data.currentApp || null,
    current_entity_id: data.currentEntityId || null,
    last_seen: data.lastSeen?.toDate().toISOString() || new Date().toISOString(),
  }));

  console.log('Migration complete!');
}

runMigration().catch(console.error);
