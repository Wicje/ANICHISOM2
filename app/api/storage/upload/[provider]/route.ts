/**
 * Storage Upload — uploads files to cloud storage
 *
 * POST /api/storage/upload/[provider]
 *
 * Receives file data from the client and uploads to the connected cloud provider.
 * Keeps OAuth tokens server-side (privacy-first).
 */

import { NextRequest } from 'next/server';
import {
  requireSession,
  apiOk,
  apiError,
  apiNotFound,
  apiForbidden,
  apiInternal,
} from '@/lib/api-helpers';
import { getStorageConnector } from '@/lib/storage-connectors/connector-registry';

const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100 MB server-side limit

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await params;

    const authResult = await requireSession(request);
    if (!authResult.ok) return authResult.response;

    const userId = authResult.userId;

    // Get connector
    let connector;
    try {
      connector = getStorageConnector(provider);
    } catch {
      return apiNotFound(`Unknown provider: ${provider}`);
    }

    if (!(await connector.isConnected(userId))) {
      return apiForbidden(`Provider "${provider}" not connected.`);
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const remotePath = (formData.get('path') as string) || '';

    if (!file) {
      return apiError('No file provided');
    }

    // Enforce server-side file size limit
    if (file.size > MAX_UPLOAD_SIZE) {
      return apiError(`File too large. Maximum upload size is ${Math.round(MAX_UPLOAD_SIZE / 1024 / 1024)}MB.`, 413);
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to cloud
    const result = await connector.uploadFile(userId, remotePath || file.name, buffer, file.type);

    return apiOk({
      id: result.id,
      name: result.name,
      path: result.path,
      size: result.size,
      mimeType: result.mimeType,
    });
  } catch (error) {
    console.error('[storage/upload] Error:', error);
    return apiInternal('Upload failed');
  }
}
