import { NextRequest, NextResponse } from 'next/server'

// Server-side image proxy — used by PDF generators to avoid browser CORS
// restrictions when fetching tenant logo URLs from Supabase Storage.
// Server → Supabase has no CORS constraint; the base64 data URI is returned
// directly to the client for embedding in @react-pdf/renderer Image components.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return new NextResponse('Missing url param', { status: 400 })
  }

  // Only proxy Supabase Storage URLs to prevent open-proxy abuse
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return new NextResponse('Invalid url', { status: 400 })
  }

  const isSupabaseStorage =
    parsed.hostname.endsWith('.supabase.co') && parsed.pathname.startsWith('/storage/')

  if (!isSupabaseStorage) {
    return new NextResponse('Only Supabase Storage URLs are allowed', { status: 403 })
  }

  try {
    const res = await fetch(url)
    if (!res.ok) {
      return new NextResponse(`Upstream ${res.status}`, { status: res.status })
    }
    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/png'
    const base64 = Buffer.from(buffer).toString('base64')
    return new NextResponse(`data:${contentType};base64,${base64}`, {
      headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'private, max-age=300' },
    })
  } catch (err) {
    return new NextResponse('Fetch failed', { status: 502 })
  }
}
