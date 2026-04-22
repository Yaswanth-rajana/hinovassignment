import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run logic for static assets
  if (request.nextUrl.pathname.startsWith('/_next')) {
    return supabaseResponse
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes logic
  const path = request.nextUrl.pathname
  
  // Check if user is admin (only if user exists)
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
      // User exists in auth but not in users table yet
      console.log('User not found in users table')
    }
  }

  // Admin routes protection
  if (path.startsWith('/admin') && !isAdmin) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Author routes protection
  if ((path.startsWith('/dashboard') || path.startsWith('/posts/create')) && !user) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}