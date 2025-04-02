import { supabase } from "./supabase"
import { supabaseAdmin } from "./supabase-admin"
import type { User, UserRole } from "@/types/user"

async function createUserProfile(userId: string, email: string, role: UserRole, name?: string) {
  try {
    // First check if the profile already exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error checking existing profile:', checkError)
      throw checkError
    }

    if (existingProfile) {
      console.log('Profile already exists, updating...')
      const { data: profileData, error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          email,
          role,
          name,
        })
        .eq('id', userId)
        .select()
        .single()

      if (updateError) {
        console.error('Profile update error:', updateError)
        console.error('Profile update error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        })
        throw updateError
      }

      return profileData
    }

    // If no existing profile, create a new one
    console.log('Creating new profile with data:', {
      id: userId,
      email,
      role,
      name,
    })

    // Use the service role client to create the profile
    const { data: profileData, error: insertError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: userId,
          email,
          role,
          name,
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error('Profile creation error:', insertError)
      console.error('Profile creation error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      })
      throw insertError
    }

    return profileData
  } catch (error: any) {
    console.error('Error managing profile:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
    throw error
  }
}

export async function createUser(email: string, password: string, name: string) {
  try {
    console.log('Starting user creation process...')
    
    // Step 1: Create auth user
    console.log('Creating auth user...')
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      throw authError
    }

    if (!authData.user) {
      throw new Error('No user data returned from signup')
    }

    console.log('Auth user created successfully:', authData.user.id)

    // Step 2: Wait for auth user to be fully created
    console.log('Waiting for auth user to be fully created...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Step 3: Sign in to establish a session
    console.log('Signing in to establish session...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      console.error('Sign in error:', signInError)
      throw signInError
    }

    if (!signInData.session) {
      throw new Error('No session established after sign in')
    }

    console.log('Session established successfully')

    // Step 4: Create user profile
    console.log('Creating user profile...')
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email,
          role: 'viewer',
          name,
        },
      ])
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      console.error('Profile creation error details:', {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint
      })
      throw profileError
    }

    console.log('User profile created successfully:', profileData)
    return profileData
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return { user: data, error: null }
  } catch (error: any) {
    console.error('Error fetching user profile:', error)
    return { user: null, error: error.message }
  }
}

export async function updateUserRole(userId: string, role: UserRole) {
  try {
    // Update the user's role in the users table
    const { error: profileError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)

    if (profileError) throw profileError

    // Update the user's role in their metadata
    const { error: metadataError } = await supabase.auth.updateUser({
      data: { role }
    })

    if (metadataError) throw metadataError

    return { error: null }
  } catch (error: any) {
    console.error('Error updating user role:', error)
    return { error: error.message }
  }
} 