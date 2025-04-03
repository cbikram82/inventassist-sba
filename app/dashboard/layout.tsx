"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { useToast } from "@/components/ui/use-toast"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    let mounted = true
    let retryCount = 0
    const maxRetries = 3

    const checkSession = async () => {
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          throw sessionError
        }

        if (!session) {
          if (mounted) {
            setIsAuthenticated(false)
            setIsLoading(false)
          }
          router.push('/login')
          return
        }

        // Get user role
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (userError) {
          console.error('User data error:', userError)
          throw userError
        }

        if (mounted) {
          setIsAuthenticated(true)
          setUserRole(userData?.role || 'viewer')
          setIsAdmin(userData?.role === 'admin')
          setIsLoading(false)
        }

        // Update last activity
        try {
          await supabase
            .from('users')
            .update({ last_activity: new Date().toISOString() })
            .eq('id', session.user.id)
        } catch (error) {
          console.error('Error updating last activity:', error)
        }

      } catch (error) {
        console.error('Auth check error:', error)
        if (mounted) {
          setIsLoading(false)
        }
        
        // Retry logic
        if (retryCount < maxRetries) {
          retryCount++
          setTimeout(checkSession, 1000 * retryCount) // Exponential backoff
        } else {
          if (mounted) {
            setIsAuthenticated(false)
            setIsLoading(false)
          }
          router.push('/login')
        }
      }
    }

    checkSession()

    // Set up session refresh interval
    const interval = setInterval(checkSession, 120000) // Check every 2 minutes

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [router])

  // Show loading state
  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Show error state if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
} 