import { NextResponse, type NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Get session from cookie manually
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  
  // Get user role
  let isAdmin = false
  if (user) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      isAdmin = userData?.role === 'admin'
    } catch (e) {
      // User not found
    }
  }

  // Protect routes
  if (path.startsWith('/admin') && !isAdmin) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if ((path.startsWith('/dashboard') || path.startsWith('/posts/create')) && !user) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}