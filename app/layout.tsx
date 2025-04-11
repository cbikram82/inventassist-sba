import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Footer } from "@/components/footer"
import { AuthProvider } from "@/app/auth-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/components/ui/theme-provider"
import { InstallPrompt } from "@/components/install-prompt"
import { ServiceWorkerRegister } from "@/components/service-worker-register"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "InventAssist | Inventory Management System by Nexenovate Ltd",
  description: "Efficient inventory management system for tracking and organizing your items",
  generator: 'v0.dev',
  manifest: '/manifest.json',
  themeColor: '#000000',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'InventAssist'
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Inventory management system for events" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="InventAssist" />
      </head>
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.className)}>
        <ErrorBoundary>
          <AuthProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <div className="relative flex min-h-screen flex-col">
                <div className="flex-1">{children}</div>
                <InstallPrompt />
                <Footer />
              </div>
            </ThemeProvider>
            <Toaster />
          </AuthProvider>
        </ErrorBoundary>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}



import './globals.css'