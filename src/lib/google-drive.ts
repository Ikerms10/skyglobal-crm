// Google Drive integration — same raw-fetch + refresh-token pattern as
// google-calendar.ts, so no googleapis dependency is needed.
// Uses a fixed refresh token for the business account (skyglobalsvcs@gmail.com)
// from GOOGLE_REFRESH_TOKEN. Server-side only.

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files'
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'

export type LeadCategory = 'residential' | 'commercial'

// Lead/project folders live under SKYGLOBAL 2026/RESIDENTIAL or /COMMERCIAL.
export function getCategoryFolderId(category: LeadCategory): string {
  const id =
    category === 'residential'
      ? process.env.GOOGLE_DRIVE_RESIDENTIAL_FOLDER_ID
      : process.env.GOOGLE_DRIVE_COMMERCIAL_FOLDER_ID
  if (!id) throw new Error(`GOOGLE_DRIVE_${category.toUpperCase()}_FOLDER_ID is not set`)
  return id
}

// Customer/project `type` is the source of truth for the category — leads
// don't carry their own type column. Unknown types default to residential.
export function toLeadCategory(customerType: string | null | undefined): LeadCategory {
  return customerType === 'Commercial' ? 'commercial' : 'residential'
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Google Drive is not configured — set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN'
    )
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  if (!res.ok) throw new Error(`Failed to refresh Google Drive token (${res.status})`)
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

export async function createDriveFolder(name: string, parentFolderId: string): Promise<string> {
  const accessToken = await getAccessToken()

  const res = await fetch(`${DRIVE_FILES_URL}?fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME_TYPE,
      parents: [parentFolderId],
    }),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Drive folder creation failed (${res.status}): ${detail}`)
  }

  const data = (await res.json()) as { id?: string }
  if (!data.id) throw new Error('Drive folder creation returned no ID')
  return data.id
}

export function getDriveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`
}
