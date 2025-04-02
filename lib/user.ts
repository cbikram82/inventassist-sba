import { supabase } from "./supabase"
import { supabaseAdmin } from "./supabase-admin"
import type { User, UserRole } from "@/types/user"

export async function createUser(email: string, password: string, role: UserRole = 'viewer', name?: string) {
  try {
    console.log('Starting user creation process...')
    
    // First, create the auth user with role in metadata
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

    // Wait a short moment to ensure the auth user is fully created
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Create the user profile in the users table using the admin client
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: authData.user.id,
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
      console.error('Profile creation error details:', {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint
      })
      // If profile creation fails, we should clean up the auth user
      await supabase.auth.signOut()
      throw profileError
    }

    console.log('User profile created successfully:', profileData)
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