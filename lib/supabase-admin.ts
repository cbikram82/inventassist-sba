import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Log environment variables (without exposing sensitive values)
console.log('Supabase Admin Client Initialization:', {
  hasUrl: !!supabaseUrl,
  hasServiceRoleKey: !!supabaseServiceRoleKey,
  urlLength: supabaseUrl?.length,
  serviceRoleKeyLength: supabaseServiceRoleKey?.length,
  environment: process.env.NODE_ENV
})

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
}

// Create the Supabase client with the service role key
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
)

// Log the client configuration
console.log('Supabase Admin Client Configuration:', {
  url: supabaseUrl,
  authOptions: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
}) 