import { supabase } from "./supabase"
import { supabaseAdmin } from "./supabase-admin"
import type { User, UserRole } from "@/types/user"

async function createUserProfile(userId: string, email: string, role: UserRole, name?: string) {
  try {
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: userId,
          email,
          role,
          name,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      throw profileError
    }

    return profileData
  } catch (error: any) {
    console.error('Error creating profile:', error)
    throw error
  }
}

export async function createUser(email: string, password: string, role: UserRole = 'viewer', name?: string) {
  try {
    console.log('Starting user creation process...')
    
    // Generate a UUID for the user
    const userId = crypto.randomUUID()
    console.log('Generated user ID:', userId)

    // First, create the user profile
    console.log('Creating user profile...')
    const profileData = await createUserProfile(userId, email, role, name)
    console.log('User profile created successfully:', profileData)

    // Then, create the auth user with the same ID
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
      // If auth user creation fails, we should clean up the profile
      try {
        await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', userId)
      } catch (deleteError) {
        console.error('Error cleaning up profile after auth failure:', deleteError)
      }
      throw authError
    }

    if (!authData.user) {
      console.error('No user data returned from auth signup')
      throw new Error("Failed to create user")
    }

    console.log('Auth user created successfully:', authData.user.id)
    return { user: authData.user, error: null }
  } catch (error: any) {
    console.error('Error creating user:', error)
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