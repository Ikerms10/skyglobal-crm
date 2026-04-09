import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Anything outside /admin/* returns 404 — the CRM is not public-facing
  if (!pathname.startsWith('/admin')) {
    return new NextResponse(null, { status: 404 })
  }

  return await updateSession(request)
}

export const config = {
  // Match all paths except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
