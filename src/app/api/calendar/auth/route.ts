export const dynamic = 'force-dynamic'

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://crm.skyglobalsvcs.com'

  console.log('Calendar auth - clientId exists:', !!clientId)
  console.log('Calendar auth - appUrl:', appUrl)

  if (!clientId || !clientSecret) {
    return Response.json({
      error: 'Google Calendar not configured',
      hint: 'GOOGLE_CLIENT_ID environment variable is missing',
      debug: {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasAppUrl: !!appUrl,
        nodeEnv: process.env.NODE_ENV,
      },
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
      'https://www.googleapis.com/auth/gmail.compose',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    login_hint: 'skyglobalsvcs@gmail.com',
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  return Response.redirect(authUrl)
}
