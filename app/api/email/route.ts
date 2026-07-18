import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  sendWelcomeEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendAppApprovedEmail,
  sendAppRejectedEmail,
  sendTrialExpiryEmail,
} from '@/lib/services/emails';

// POST — Send email by type (admin or system only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, userId, email, name, ...params } = body;

    if (!type) {
      return NextResponse.json({ ok: false, error: 'Missing type' }, { status: 400 });
    }

    let targetEmail = email;
    let targetName = name;

    // If userId provided, fetch user data
    if (userId && (!targetEmail || !targetName)) {
      const { data: userData } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single();

      if (userData) {
        targetEmail = targetEmail || userData.email;
        targetName = targetName || userData.name;
      }
    }

    if (!targetEmail) {
      return NextResponse.json({ ok: false, error: 'No target email' }, { status: 400 });
    }

    let sent = false;

    switch (type) {
      case 'welcome':
        sent = await sendWelcomeEmail(targetEmail, targetName || 'User');
        break;
      case 'approval':
        sent = await sendApprovalEmail(targetEmail, targetName || 'User');
        break;
      case 'rejection':
        sent = await sendRejectionEmail(targetEmail, targetName || 'User', params.reason);
        break;
      case 'app-approved':
        sent = await sendAppApprovedEmail(targetEmail, targetName || 'Developer', params.appName || 'Your App');
        break;
      case 'app-rejected':
        sent = await sendAppRejectedEmail(targetEmail, targetName || 'Developer', params.appName || 'Your App', params.reason);
        break;
      case 'trial-expiry':
        sent = await sendTrialExpiryEmail(targetEmail, targetName || 'User', params.daysLeft || 7);
        break;
      default:
        return NextResponse.json({ ok: false, error: `Unknown email type: ${type}` }, { status: 400 });
    }

    return NextResponse.json({ ok: sent });
  } catch (error) {
    console.error('[Email API] Error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to send email' }, { status: 500 });
  }
}
