import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    let query = supabase
      .from('context_records')
      .select('domain, data, version, updated_at')
      .eq('user_id', user.id);

    if (domain) {
      query = query.eq('domain', domain);
    }

    const { data: records, error: queryError } = await query;

    if (queryError) {
      return NextResponse.json({ ok: false, error: queryError.message }, { status: 500 });
    }

    const context: Record<string, unknown> = {};
    let latestVersion = 0;

    for (const record of records || []) {
      context[record.domain] = record.data;
      if (record.version > latestVersion) latestVersion = record.version;
    }

    const exportData = {
      continuaos_context: true,
      version: 1,
      exportedAt: new Date().toISOString(),
      userId: user.id,
      domainCount: Object.keys(context).length,
      latestVersion,
      context,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="continuaos-context-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Export failed' }, { status: 500 });
  }
}
