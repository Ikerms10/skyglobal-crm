import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

interface DraftRequestBody {
  to: string
  subject: string
  htmlBody: string
  pdfBase64: string
  filename: string
}

async function buildMimeMessage(to: string, subject: string, htmlBody: string, pdfBase64: string, filename: string): Promise<string> {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const htmlBase64 = Buffer.from(htmlBody, 'utf8').toString('base64')

  const mime = [
    'MIME-Version: 1.0',
    'From: skyglobalsvcs@gmail.com',
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    htmlBase64,
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${filename}"`,
    '',
    pdfBase64,
    '',
    `--${boundary}--`,
  ].join('\r\n')

  return Buffer.from(mime).toString('base64url')
}

async function createGmailDraft(accessToken: string, rawMessage: string): Promise<Response> {
  return fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: { raw: rawMessage } }),
  })
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error_description || 'Token refresh failed')
  }

  return response.json()
}

export async function POST(request: NextRequest) {
  let body: DraftRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { to, subject, htmlBody, pdfBase64, filename } = body
  if (!to || !subject || !htmlBody || !pdfBase64 || !filename) {
    return NextResponse.json({ error: 'Missing required fields: to, subject, htmlBody, pdfBase64, filename' }, { status: 400 })
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
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const meta = user.user_metadata ?? {}
  let accessToken: string = meta.google_access_token
  const refreshToken: string = meta.google_refresh_token

  if (!accessToken) {
    return NextResponse.json({ error: 'Google account not connected. Connect Google in Settings.' }, { status: 403 })
  }

  const rawMessage = await buildMimeMessage(to, subject, htmlBody, pdfBase64, filename)

  let gmailResponse = await createGmailDraft(accessToken, rawMessage)

  if (gmailResponse.status === 401 && refreshToken) {
    try {
      const refreshed = await refreshAccessToken(refreshToken)
      accessToken = refreshed.access_token

      await supabase.auth.updateUser({
        data: {
          google_access_token: accessToken,
          google_token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        },
      })

      gmailResponse = await createGmailDraft(accessToken, rawMessage)
    } catch (refreshErr) {
      return NextResponse.json(
        { error: 'Token refresh failed. Please reconnect Google in Settings.' },
        { status: 401 }
      )
    }
  }

  if (!gmailResponse.ok) {
    const errBody = await gmailResponse.json().catch(() => ({}))
    return NextResponse.json(
      { error: errBody?.error?.message ?? 'Gmail API error', details: errBody },
      { status: gmailResponse.status }
    )
  }

  const draft = await gmailResponse.json()
  return NextResponse.json({ draftId: draft.id, success: true })
}
