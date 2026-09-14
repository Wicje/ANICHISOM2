/**
 * Workspace Protocol — Projects
 *
 * GET    /api/workspaces/projects?workspaceId=xxx         — List projects
 * GET    /api/workspaces/projects?id=xxx                  — Get project
 * POST   /api/workspaces/projects                         — Create project
 * PATCH  /api/workspaces/projects?id=xxx                  — Update project
 */
import { NextRequest } from 'next/server';
import { apiOk, apiError, apiInternal, requireSession } from '@/lib/api-helpers';
import { createServerAdapter } from '@/lib/supabase-adapter';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const { workspaceAdapter, projectAdapter } = createServerAdapter(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');
    const workspaceId = searchParams.get('workspaceId');

    if (projectId) {
      const project = await projectAdapter.get(projectId);
      if (!project) return apiError('Project not found', 404);
      return apiOk(project);
    }

    if (workspaceId) {
      const projects = await projectAdapter.getByWorkspace(workspaceId);
      return apiOk(projects);
    }

    // Default: return user's workspaces
    const workspaces = await workspaceAdapter.getByUser(auth.userId);
    return apiOk(workspaces);
  } catch (error) {
    console.error('[workspaces/projects] Error:', error);
    return apiInternal();
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const { projectAdapter } = createServerAdapter(request);
    const body = await request.json();
    if (!body.workspaceId || !body.name) {
      return apiError('workspaceId and name are required');
    }

    await projectAdapter.create({
      id: crypto.randomUUID(),
      workspaceId: body.workspaceId,
      name: body.name,
      clientId: body.clientId || '',
      brief: body.brief || '',
      status: 'discovery',
      phase: 'discovery',
      timeline: {
        startDate: new Date(),
        endDate: new Date(),
        milestones: [],
      },
      team: [],
      deliverables: [],
      createdBy: auth.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return apiOk({ created: true });
  } catch (error) {
    console.error('[workspaces/projects] Error:', error);
    return apiInternal();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const { projectAdapter } = createServerAdapter(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');
    if (!projectId) return apiError('project id is required');

    const body = await request.json();
    await projectAdapter.update(projectId, body);

    return apiOk({ updated: true });
  } catch (error) {
    console.error('[workspaces/projects] Error:', error);
    return apiInternal();
  }
}
