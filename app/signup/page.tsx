import { SignUpForm } from "@/components/sign-up-form"

export default function SignUpPage() {
  return (
    <div className="container max-w-md mx-auto py-8">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Create an Account</h1>
          <p className="text-muted-foreground">
            Sign up to access the inventory management system
          </p>
        </div>

        <SignUpForm />
      </div>
    </div>
  )
} 