"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, LayoutDashboard, Package, BarChart, Settings, Users } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

const sidebarNavItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Inventory",
    href: "/dashboard/inventory",
    icon: Package,
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: BarChart,
  },
  {
    title: "Users",
    href: "/dashboard/users",
    icon: Users,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [userEmail, setUserEmail] = useState<string>("")

  useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session error:', error)
          if (mounted) {
            router.push('/login')
          }
          return
        }

        if (!session) {
          if (mounted) {
            router.push('/login')
          }
          return
        }

        // Update last activity
        const { error: updateError } = await supabase
          .from('users')
          .update({ last_activity: new Date().toISOString() })
          .eq('id', session.user.id)

        if (updateError) {
          console.error('Error updating last activity:', updateError)
          // Don't throw the error as this is not critical
        }

        const { data: userData } = await supabase
          .from('users')
          .select('role, email')
          .eq('id', session.user.id)
          .single()

        if (mounted) {
          setUserRole(userData?.role || '')
          setIsAdmin(userData?.role === 'admin')
          setUserEmail(userData?.email || '')
          setIsLoading(false)
        }

      } catch (error) {
        console.error('Session check error:', error)
        if (mounted) {
          router.push('/login')
        }
      }
    }

    checkSession()

    // Set up session refresh interval
    const refreshInterval = setInterval(checkSession, 2 * 60 * 1000) // Check every 2 minutes

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (mounted) {
          router.push('/login')
        }
      } else if (event === 'TOKEN_REFRESHED') {
        // Session was refreshed successfully
        console.log('Session refreshed successfully')
      }
    })

    return () => {
      mounted = false
      clearInterval(refreshInterval)
      subscription.unsubscribe()
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      // Force redirect to login even if sign out fails
      router.push('/login')
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="flex items-center space-x-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[240px] sm:w-[280px]">
                <nav className="flex flex-col space-y-1">
                  {sidebarNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                        pathname === item.href ? "bg-accent" : "transparent"
                      )}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </Link>
                  ))}
                  <div className="mt-auto pt-4 border-t">
                    <div className="px-3 py-2">
                      <p className="text-sm text-muted-foreground">{userEmail}</p>
                    </div>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Image
                src="/inventassist-logo.png"
                alt="InventAssist Logo"
                width={32}
                height={32}
                className="rounded-sm"
              />
              <span className="text-xl font-bold">InventAssist</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <Button variant="ghost" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      <div className="container flex-1">
        <div className="flex flex-col md:flex-row">
          <aside className="hidden md:block w-[240px] shrink-0 border-r pr-4 py-4">
            <nav className="flex flex-col space-y-1 h-full">
              {sidebarNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    pathname === item.href ? "bg-accent" : "transparent"
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Link>
              ))}
              <div className="mt-auto pt-4 border-t">
                <div className="px-3 py-2">
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
              </div>
            </nav>
          </aside>
          <main className="flex-1 py-4 md:pl-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
} 