import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// POST — Submit a new app for review
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      version,
      category,
      icon,
      manifestUrl,
      permissions,
      tags,
    } = body;

    // Validate required fields
    if (!name || !description || !version || !manifestUrl) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: name, description, version, manifestUrl' },
        { status: 400 }
      );
    }

    // Validate version format (semver)
    const semverRegex = /^\d+\.\d+\.\d+$/;
    if (!semverRegex.test(version)) {
      return NextResponse.json(
        { ok: false, error: 'Version must be in semver format (e.g., 1.0.0)' },
        { status: 400 }
      );
    }

    // Create submission record
    const submission = {
      id: crypto.randomUUID(),
      developer_id: user.id,
      name,
      description,
      version,
      category: category || 'utilities',
      icon: icon || 'Package',
      manifest_url: manifestUrl,
      permissions: permissions || [],
      tags: tags || [],
      status: 'pending',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert into database
    const { data, error } = await supabase
      .from('marketplace_submissions')
      .insert(submission)
      .select()
      .single();

    if (error) {
      console.error('[Marketplace] Insert error:', error);
      return NextResponse.json({ ok: false, error: 'Failed to submit app' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, submission: data });
  } catch (error) {
    console.error('[Marketplace] Error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to submit app' }, { status: 500 });
  }
}

// GET — List submissions (admin only)
export async function GET(request: NextRequest) {
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
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data, error } = await supabase
      .from('marketplace_submissions')
      .select('*')
      .eq('status', status)
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Marketplace] Query error:', error);
      return NextResponse.json({ ok: false, error: 'Failed to fetch submissions' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, submissions: data });
  } catch (error) {
    console.error('[Marketplace] Error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch submissions' }, { status: 500 });
  }
}
