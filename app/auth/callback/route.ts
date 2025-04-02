import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token = requestUrl.searchParams.get('token')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  try {
    const supabase = createRouteHandlerClient({ cookies })

    if (token) {
      // Handle email confirmation
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      })

      if (error) {
        console.error('Email verification error:', error)
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
      }

      // After successful verification, redirect to login
      return NextResponse.redirect(new URL('/login?message=Email confirmed successfully. Please sign in.', requestUrl.origin))
    } else if (code) {
      // Handle OAuth callback
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
      }
    }

    // Check if email is confirmed
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.error('User fetch error:', userError)
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(userError.message)}`, requestUrl.origin))
    }

    if (!user?.email_confirmed_at) {
      return NextResponse.redirect(new URL('/login?error=Please confirm your email before signing in', requestUrl.origin))
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  } catch (error) {
    console.error('Auth callback exception:', error)
    return NextResponse.redirect(new URL(`/login?error=An unexpected error occurred`, requestUrl.origin))
  }
} 