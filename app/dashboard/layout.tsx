"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

const sidebarNavItems = [
  {
    title: "Overview",
    href: "/dashboard",
  },
  {
    title: "Inventory",
    href: "/dashboard/inventory",
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
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
                      {item.title}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="font-bold">Inventory Manager</span>
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
                  {item.title}
                </Link>
              ))}
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