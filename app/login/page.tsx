"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import Image from "next/image"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  useEffect(() => {
    if (error) {
      console.error("Login error from callback:", error)
    }
  }, [error])

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col items-center space-y-4">
          <Image
            src="/inventassist-logo.png"
            alt="Invent Assist Logo"
            width={200}
            height={100}
            className="mb-4"
          />
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email to sign in to your account
            </p>
          </div>
        </div>
        <LoginForm initialError={error} />
      </div>
    </div>
  )
} 