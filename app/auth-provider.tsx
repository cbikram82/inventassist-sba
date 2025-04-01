"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

// Create a context to share authentication state
const AuthContext = createContext<{ isAuthenticated: boolean }>({
  isAuthenticated: false,
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Auto-login with a guest account
    const autoLogin = async () => {
      setIsLoading(true)

      try {
        // Check if already authenticated
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          // If no session exists, perform anonymous sign-in
          // This effectively bypasses any login screen
          await supabase.auth.signInAnonymously()
        }

        setIsAuthenticated(true)
      } catch (error) {
        console.error("Auto-login failed:", error)
      } finally {
        setIsLoading(false)
      }
    }

    autoLogin()

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <AuthContext.Provider value={{ isAuthenticated }}>{children}</AuthContext.Provider>
}

