export const dynamic = 'force-dynamic'

import type { NextRequest } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/ratelimit'

// 10 OAuth initiations per minute per IP
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60 * 1000

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  if (!rateLimit(`calendar-auth:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://crm.skyglobalsvcs.com'

  if (!clientId || !clientSecret) {
    return Response.json({ error: 'Google Calendar integration is not configured.' }, { status: 503 })
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

  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
