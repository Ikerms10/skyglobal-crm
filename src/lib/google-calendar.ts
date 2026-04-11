// Google Calendar integration service

export interface CalendarTokens {
  access_token: string
  refresh_token: string
  expires_at: number // unix timestamp ms
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'

// Refresh access token if expired
export async function getValidAccessToken(tokens: CalendarTokens): Promise<string> {
  if (Date.now() < tokens.expires_at - 60_000) {
    return tokens.access_token
  }
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  })
  if (!res.ok) throw new Error('Failed to refresh Google token')
  const data = await res.json()
  return data.access_token as string
}

interface ProjectEvent {
  title: string
  start_date: string | null
  end_date: string | null
  address?: string | null
  description?: string | null
  id: string
}

export async function createCalendarEvent(tokens: CalendarTokens, project: ProjectEvent): Promise<string> {
  const accessToken = await getValidAccessToken(tokens)
  const event = {
    summary: `${project.title} — SkyGlobal`,
    location: project.address ?? undefined,
    description: [
      project.description ?? '',
      '',
      `CRM: ${process.env.NEXT_PUBLIC_APP_URL}/customers`,
    ].filter(Boolean).join('\n'),
    start: {
      date: project.start_date ?? new Date().toISOString().split('T')[0],
    },
    end: {
      date: project.end_date ?? project.start_date ?? new Date().toISOString().split('T')[0],
    },
    colorId: '5', // banana = closest to gold in Google Calendar
  }

  const res = await fetch(`${CALENDAR_BASE}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })
  if (!res.ok) throw new Error('Failed to create calendar event')
  const data = await res.json()
  return data.id as string
}

export async function updateCalendarEvent(
  tokens: CalendarTokens,
  eventId: string,
  project: ProjectEvent
): Promise<void> {
  const accessToken = await getValidAccessToken(tokens)
  const event = {
    summary: `${project.title} — SkyGlobal`,
    location: project.address ?? undefined,
    description: project.description ?? '',
    start: { date: project.start_date ?? new Date().toISOString().split('T')[0] },
    end: { date: project.end_date ?? project.start_date ?? new Date().toISOString().split('T')[0] },
    colorId: '5',
  }
  const res = await fetch(`${CALENDAR_BASE}/calendars/primary/events/${eventId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })
  if (!res.ok) throw new Error('Failed to update calendar event')
}

export async function deleteCalendarEvent(tokens: CalendarTokens, eventId: string): Promise<void> {
  const accessToken = await getValidAccessToken(tokens)
  await fetch(`${CALENDAR_BASE}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function getUpcomingEvents(tokens: CalendarTokens): Promise<unknown[]> {
  const accessToken = await getValidAccessToken(tokens)
  const now = new Date().toISOString()
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const res = await fetch(
    `${CALENDAR_BASE}/calendars/primary/events?timeMin=${now}&timeMax=${nextWeek}&orderBy=startTime&singleEvents=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error('Failed to fetch calendar events')
  const data = await res.json()
  return (data.items as unknown[]) ?? []
}
