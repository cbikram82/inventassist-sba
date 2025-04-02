import { supabase } from "./supabase"
import type { User, UserRole } from "@/types/user"

async function createUserProfile(userId: string, email: string, role: UserRole, name?: string) {
  try {
    // First check if the profile already exists
    const { data: existingProfile, error: checkError } = await supabase
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
      const { data: profileData, error: updateError } = await supabase
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

    // Use the regular client to create the profile
    const { data: profileData, error: insertError } = await supabase
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

export async function createUser(email: string, password: string, role: UserRole = 'viewer', name?: string) {
  try {
    console.log('Starting user creation process...')
    
    // First, create the auth user
    console.log('Creating auth user...')
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          name,
        },
      },
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      throw authError
    }

    if (!authData.user) {
      console.error('No user data returned from auth signup')
      throw new Error("Failed to create user")
    }

    console.log('Auth user created successfully:', authData.user.id)

    // Wait longer to ensure the auth user is fully created and propagated
    console.log('Waiting for auth user to propagate...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Then create or update the user profile
    console.log('Creating/updating user profile...')
    const profileData = await createUserProfile(
      authData.user.id,
      email,
      role,
      name
    )
    console.log('User profile managed successfully:', profileData)

    return { user: authData.user, error: null }
  } catch (error: any) {
    console.error('Error creating user:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
    // If profile creation fails, we should clean up the auth user
    try {
      await supabase.auth.signOut()
    } catch (signOutError) {
      console.error('Error signing out after profile creation failure:', signOutError)
    }
    return { user: null, error: error.message }
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