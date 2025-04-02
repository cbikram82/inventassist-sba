import { supabase } from "./supabase"
import type { User, UserRole } from "@/types/user"

export async function createUser(email: string, password: string, role: UserRole = 'viewer', name?: string) {
  try {
    // First, create the auth user
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

    if (authError) throw authError

    if (!authData.user) throw new Error("Failed to create user")

    // Then, create the user profile in the users table
    const { error: profileError } = await supabase
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

    if (profileError) throw profileError

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
    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)

    if (error) throw error
    return { error: null }
  } catch (error: any) {
    console.error('Error updating user role:', error)
    return { error: error.message }
  }
} 