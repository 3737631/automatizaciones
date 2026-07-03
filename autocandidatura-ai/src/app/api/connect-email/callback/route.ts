import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { exchangeGmailCode } from '@/lib/gmail/service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      console.error('Error en OAuth de Google:', errorParam);
      return NextResponse.redirect(new URL('/?error=oauth_denied', req.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/?error=no_code', req.url));
    }

    const tokens = await exchangeGmailCode(code);

    const encryptedAccess = Buffer.from(tokens.access_token).toString('base64');
    const encryptedRefresh = Buffer.from(tokens.refresh_token).toString('base64');

    const supabase = createAdminClient();

    if (state) {
      const { data: session } = await supabase
        .from('sessions')
        .select('id')
        .eq('session_token', state)
        .single();

      if (session) {
        await supabase
          .from('sessions')
          .update({
            gmail_access_token_encrypted: encryptedAccess,
            gmail_refresh_token_encrypted: encryptedRefresh,
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.id);
      }
    }

    return NextResponse.redirect(new URL('/upload-cv', req.url));
  } catch (error) {
    console.error('Error en callback OAuth:', error);
    return NextResponse.redirect(new URL('/?error=oauth_failed', req.url));
  }
}
