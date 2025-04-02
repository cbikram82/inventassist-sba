import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="container max-w-md mx-auto py-8">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in to access the inventory management system
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
} 