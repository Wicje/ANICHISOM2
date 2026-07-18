import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { context, mode = 'merge' } = body;

    if (!context || typeof context !== 'object') {
      return NextResponse.json({ ok: false, error: 'Invalid context data' }, { status: 400 });
    }

    if (mode !== 'merge' && mode !== 'replace') {
      return NextResponse.json({ ok: false, error: 'Mode must be "merge" or "replace"' }, { status: 400 });
    }

    const deviceId = request.headers.get('x-device-id') || 'import';
    const results: { domain: string; action: string }[] = [];

    if (mode === 'replace') {
      const { error: deleteError } = await supabase
        .from('context_records')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        return NextResponse.json({ ok: false, error: `Failed to clear existing context: ${deleteError.message}` }, { status: 500 });
      }
    }

    for (const [domain, data] of Object.entries(context)) {
      const id = `${user.id}:${domain}`;

      if (mode === 'merge') {
        const { data: existing } = await supabase
          .from('context_records')
          .select('version')
          .eq('id', id)
          .single();

        const newVersion = (existing?.version || 0) + 1;

        const { error: upsertError } = await supabase
          .from('context_records')
          .upsert({
            id,
            user_id: user.id,
            domain,
            data,
            version: newVersion,
            device_id: deviceId,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (upsertError) {
          results.push({ domain, action: `error: ${upsertError.message}` });
        } else {
          results.push({ domain, action: 'imported' });
        }
      } else {
        const { error: insertError } = await supabase
          .from('context_records')
          .insert({
            id,
            user_id: user.id,
            domain,
            data,
            version: 1,
            device_id: deviceId,
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          results.push({ domain, action: `error: ${insertError.message}` });
        } else {
          results.push({ domain, action: 'imported' });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      imported: results.filter(r => r.action === 'imported').length,
      errors: results.filter(r => r.action.startsWith('error')).length,
      results,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Import failed' }, { status: 500 });
  }
}
