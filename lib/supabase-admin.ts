import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Log environment variables (without exposing sensitive values)
console.log('Environment check:', {
  supabaseUrl: supabaseUrl ? 'exists' : 'missing',
  supabaseServiceKey: supabaseServiceKey ? 'exists' : 'missing',
  supabaseServiceKeyLength: supabaseServiceKey ? supabaseServiceKey.length : 0,
  isServer: typeof window === 'undefined',
  environment: process.env.NODE_ENV
})

if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL')
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseServiceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
  throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY')
}

// Create the Supabase admin client with service role key
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) 