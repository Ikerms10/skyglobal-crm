import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.skyglobalsvcs.com'

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?calendar=error`)
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/calendar/callback`,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenResponse.json()
    if (!tokenResponse.ok) {
      throw new Error(tokens.error_description || 'Token exchange failed')
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${appUrl}/login`)

    await supabase.auth.updateUser({
      data: {
        google_calendar_connected: true,
        google_calendar_connected_at: new Date().toISOString(),
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        google_token_expires_at: new Date(
          Date.now() + tokens.expires_in * 1000
        ).toISOString(),
      },
    })

    return NextResponse.redirect(`${appUrl}/settings?calendar=connected`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.redirect(
      `${appUrl}/settings?calendar=error&reason=${encodeURIComponent(msg)}`
    )
  }
}
