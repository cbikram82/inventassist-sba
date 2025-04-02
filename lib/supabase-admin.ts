import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Log environment variables (without exposing sensitive values)
console.log('Supabase Admin Client Initialization:', {
  hasUrl: !!supabaseUrl,
  hasServiceRoleKey: !!supabaseServiceRoleKey,
  hasAnonKey: !!supabaseAnonKey,
  urlLength: supabaseUrl?.length,
  serviceRoleKeyLength: supabaseServiceRoleKey?.length,
  anonKeyLength: supabaseAnonKey?.length
})

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseServiceRoleKey && !supabaseAnonKey) {
  throw new Error('Missing both SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Create the Supabase client with the service role key if available, otherwise fall back to anon key
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || supabaseAnonKey!,
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
  usingServiceRole: !!supabaseServiceRoleKey,
  authOptions: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
}) 