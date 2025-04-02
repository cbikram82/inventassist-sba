import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  try {
    const supabase = createRouteHandlerClient({ cookies })

    if (code) {
      // Handle OAuth callback
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
      }
    }

    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.error('User fetch error:', userError)
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(userError.message)}`, requestUrl.origin))
    }

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=Please sign in to continue', requestUrl.origin))
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  } catch (error) {
    console.error('Auth callback exception:', error)
    return NextResponse.redirect(new URL(`/login?error=An unexpected error occurred`, requestUrl.origin))
  }
} 