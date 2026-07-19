/**
 * Context Protocol — Snapshot
 *
 * POST /api/context/snapshot — Create a snapshot
 * GET  /api/context/snapshot?id=xxx — Get a snapshot
 * GET  /api/context/snapshot — List snapshots
 */

import { NextRequest } from 'next/server';
import { apiOk, apiError, apiInternal, requireSession } from '@/lib/api-helpers';
import { getContextRepository } from '@/lib/context-kernel';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const snapshotId = searchParams.get('id');

    const repo = getContextRepository();

    if (snapshotId) {
      const snapshot = await repo.getSnapshot(snapshotId);
      if (!snapshot) return apiError('Snapshot not found', 404);
      return apiOk(snapshot);
    }

    const snapshots = await repo.listSnapshots(auth.userId);
    return apiOk(snapshots);
  } catch (error) {
    console.error('[context/snapshot] Error:', error);
    return apiInternal();
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const repo = getContextRepository();

    const snapshot = await repo.createSnapshot(auth.userId, {
      domains: body.domains,
    });

    return apiOk(snapshot);
  } catch (error) {
    console.error('[context/snapshot] Error:', error);
    return apiInternal();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const snapshotId = searchParams.get('id');
    if (!snapshotId) return apiError('snapshot id is required');

    const repo = getContextRepository();
    await repo.deleteSnapshot(snapshotId);

    return apiOk({ deleted: true });
  } catch (error) {
    console.error('[context/snapshot] Error:', error);
    return apiInternal();
  }
}
