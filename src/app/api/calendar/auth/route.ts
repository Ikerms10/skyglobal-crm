import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.skyglobalsvcs.com'

  if (!clientId) {
    return NextResponse.json({
      error: 'Google Calendar not configured',
      hint: 'GOOGLE_CLIENT_ID environment variable is missing',
    }, { status: 503 })
  }

  const redirectUri = `${appUrl}/api/calendar/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    login_hint: 'skyglobalsvcs@gmail.com',
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  return NextResponse.redirect(authUrl)
}
