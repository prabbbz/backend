import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const publicSupabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return NextResponse.json({
    ok: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      publicSupabaseKey &&
      process.env.SUPABASE_SECRET_KEY &&
      process.env.OWNER_USER_ID &&
      process.env.INSTALL_KEY
    ),
    app: 'PRABU Remote',
    version: '0.2.0',
    config: {
      supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabasePublicKey: Boolean(publicSupabaseKey),
      supabaseSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY),
      ownerUserId: Boolean(process.env.OWNER_USER_ID),
      installKey: Boolean(process.env.INSTALL_KEY),
    },
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
