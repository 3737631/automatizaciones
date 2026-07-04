import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.redirect(new URL('/?error=server_required', 'https://example.com'));
}
