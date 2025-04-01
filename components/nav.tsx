"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Boxes, Home } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    name: "Inventory",
    href: "/inventory",
    icon: Boxes,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center text-sm font-medium transition-colors hover:text-primary",
            pathname === item.href ? "text-primary" : "text-muted-foreground",
          )}
        >
          <item.icon className="mr-2 h-4 w-4" />
          {item.name}
        </Link>
      ))}
    </nav>
  )
}

