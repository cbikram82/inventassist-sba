import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Log environment variables (without exposing sensitive values)
console.log('Environment check:', {
  supabaseUrl: supabaseUrl ? 'exists' : 'missing',
  supabaseServiceKey: supabaseServiceKey ? 'exists' : 'missing',
  supabaseAnonKey: supabaseAnonKey ? 'exists' : 'missing',
  isServer: typeof window === 'undefined',
  environment: process.env.NODE_ENV
})

if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL')
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Create the Supabase client with appropriate role
const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  supabaseServiceKey ? {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  } : undefined
)

export { supabaseAdmin } 