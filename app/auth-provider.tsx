"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { AuthState, User } from "@/types/user"
import { getUserProfile } from "@/lib/user"

// Create a context to share authentication state
const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  user: null,
  isLoading: true,
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Auto-login with a guest account
    const autoLogin = async () => {
      setAuthState(prev => ({ ...prev, isLoading: true }))
      setError(null)

      try {
        // Check if already authenticated
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          // If no session exists, perform anonymous sign-in
          const { data: { user }, error: signInError } = await supabase.auth.signInAnonymously()
          
          if (signInError) {
            console.error("Anonymous sign-in error:", signInError)
            setError("Failed to initialize authentication")
            return
          }
          
          if (user) {
            // Fetch user profile from the database
            const { user: userProfile, error: profileError } = await getUserProfile(user.id)
            
            if (profileError) {
              console.error("Failed to fetch user profile:", profileError)
              setError("Failed to load user profile")
              return
            }

            setAuthState({
              isAuthenticated: true,
              user: userProfile,
              isLoading: false,
            })
          }
        } else {
          // Fetch user profile from the database
          const { user: userProfile, error: profileError } = await getUserProfile(session.user.id)
          
          if (profileError) {
            console.error("Failed to fetch user profile:", profileError)
            setError("Failed to load user profile")
            return
          }

          setAuthState({
            isAuthenticated: true,
            user: userProfile,
            isLoading: false,
          })
        }
      } catch (error) {
        console.error("Auto-login failed:", error)
        setError("Failed to initialize authentication")
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        })
      }
    }

    autoLogin()

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch user profile from the database
        const { user: userProfile, error: profileError } = await getUserProfile(session.user.id)
        
        if (profileError) {
          console.error("Failed to fetch user profile:", profileError)
          setError("Failed to load user profile")
          return
        }

        setAuthState({
          isAuthenticated: true,
          user: userProfile,
          isLoading: false,
        })
      } else {
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (authState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-500">Authentication Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
}

