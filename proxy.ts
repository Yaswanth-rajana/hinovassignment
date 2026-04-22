import { NextResponse, type NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Skip for API routes and static files
  if (path.startsWith('/_next') || path.startsWith('/api') || path.includes('.')) {
    return NextResponse.next()
  }

  // Get session
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  
  // Get user role from database
  let userRole = null
  let isAdmin = false
  
  if (user) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      userRole = userData?.role
      isAdmin = userRole === 'admin'
    } catch (e) {
      console.error('Error fetching user role:', e)
    }
  }

  // Auth pages - redirect if already logged in
  if ((path === '/auth/signin' || path === '/auth/signup') && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Admin routes protection
  if (path.startsWith('/admin') && !isAdmin) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Author routes protection
  if ((path.startsWith('/dashboard') || path.startsWith('/posts/create')) && !user) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // Edit post protection (will be checked in component too)
  if (path.startsWith('/posts/edit/') && !user) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}