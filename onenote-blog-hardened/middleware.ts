import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!pathname.startsWith('/admin')) return NextResponse.next()

  const user = process.env.ADMIN_USER || 'admin'
  const pass = process.env.ADMIN_PASSWORD || ''

  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return new NextResponse('Authentication required.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
    })
  }

  const [scheme, encoded] = authHeader.split(' ')
  if (scheme !== 'Basic' || !encoded) {
    return new NextResponse('Invalid auth.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
    })
  }

  const decoded = atob(encoded)
  const [u, p] = decoded.split(':')

  if (u !== user || p !== pass) {
    return new NextResponse('Unauthorized.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
