import { supabase } from "./supabase"
import { supabaseAdmin } from "./supabase-admin"
import type { User, UserRole } from "@/types/user"
import { AuthResponse, AuthError } from "@supabase/supabase-js"

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
    const signUpResponse = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpResponse.error) {
      console.error('Auth user creation error:', signUpResponse.error)
      throw signUpResponse.error
    }

    if (!signUpResponse.data.user) {
      throw new Error('No user data returned from signup')
    }

    console.log('Auth user created successfully:', signUpResponse.data.user.id)

    // Step 2: Wait for auth user to be fully created
    console.log('Waiting for auth user to be fully created...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Step 3: Create user profile using the admin client
    console.log('Creating user profile...')
    const profileData = await createUserProfile(
      signUpResponse.data.user.id,
      email,
      'viewer',
      name
    )

    console.log('User profile created successfully:', profileData)

    // Step 4: Return success with a message about email confirmation
    return {
      success: true,
      message: 'Please check your email to confirm your account. After confirming, you can sign in.',
      user: profileData
    }
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