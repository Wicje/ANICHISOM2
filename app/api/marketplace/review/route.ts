import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// POST — Review (approve/reject) a submission
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json({ ok: false, error: 'Forbidden — admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { submissionId, action, reviewNotes } = body;

    if (!submissionId || !action) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: submissionId, action' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { ok: false, error: 'Action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Fetch the submission
    const { data: submission, error: fetchError } = await supabase
      .from('marketplace_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json({ ok: false, error: 'Submission not found' }, { status: 404 });
    }

    if (submission.status !== 'pending') {
      return NextResponse.json(
        { ok: false, error: 'Submission has already been reviewed' },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update submission status
    const { error: updateError } = await supabase
      .from('marketplace_submissions')
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('[Marketplace] Update error:', updateError);
      return NextResponse.json({ ok: false, error: 'Failed to update submission' }, { status: 500 });
    }

    // If approved, create the published app record
    if (action === 'approve') {
      const publishedApp = {
        id: submission.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        submission_id: submissionId,
        developer_id: submission.developer_id,
        name: submission.name,
        description: submission.description,
        version: submission.version,
        category: submission.category,
        icon: submission.icon,
        manifest_url: submission.manifest_url,
        permissions: submission.permissions,
        tags: submission.tags,
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: publishError } = await supabase
        .from('marketplace_apps')
        .upsert(publishedApp, { onConflict: 'id' });

      if (publishError) {
        console.error('[Marketplace] Publish error:', publishError);
        // Don't fail the review — just log the error
      }
    }

    return NextResponse.json({
      ok: true,
      submission: {
        ...submission,
        status: newStatus,
        review_notes: reviewNotes,
      },
    });
  } catch (error) {
    console.error('[Marketplace] Review error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to review submission' }, { status: 500 });
  }
}
