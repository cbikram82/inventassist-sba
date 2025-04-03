"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface LoginFormProps {
  initialError?: string | null
}

export function LoginForm({ initialError }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError || null)
  const [isResending, setIsResending] = useState(false)
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Handle success message from email confirmation
  useEffect(() => {
    const message = searchParams.get("message")
    if (message) {
      setMessage(decodeURIComponent(message))
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: (e.target as HTMLFormElement).password.value,
      })

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setError("Please confirm your email before signing in. Check your inbox for the confirmation link.")
        } else {
          setError(error.message)
        }
      } else if (data.user) {
        // Check if user exists in the users table
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (userError && userError.code !== 'PGRST116') {
          throw userError
        }

        if (!existingUser) {
          // Create new user record if it doesn't exist
          const { error: insertError } = await supabase
            .from('users')
            .insert([
              {
                id: data.user.id,
                email: data.user.email,
                role: 'viewer', // Default role
                created_at: new Date().toISOString(),
                last_activity: new Date().toISOString()
              }
            ])

          if (insertError) throw insertError
        } else {
          // Update last activity for existing user
          const { error: updateError } = await supabase
            .from('users')
            .update({ last_activity: new Date().toISOString() })
            .eq('id', data.user.id)

          if (updateError) throw updateError
        }

        router.push("/dashboard")
        router.refresh()
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      setError("Please enter your email address")
      return
    }

    setIsResending(true)
    setError(null)
    setMessage(null)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage("Confirmation email sent! Please check your inbox.")
      }
    } catch (error) {
      setError("An unexpected error occurred")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
          {error?.includes("confirm your email") && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResendConfirmation}
              disabled={isResending}
            >
              {isResending ? "Sending..." : "Resend confirmation email"}
            </Button>
          )}
          <p className="text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
} 