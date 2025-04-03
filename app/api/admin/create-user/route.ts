import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the current user's session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if the current user is an admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the request body
    const { email, password, role } = await request.json()

    // Create the user in Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 400 })
    }

    // Create the user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert([{
        id: user.id,
        email: user.email,
        role,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      }])

    if (profileError) {
      console.error('Profile error:', profileError)
      // Clean up the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 