import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Log environment variables (without exposing sensitive values)
console.log('Supabase URL exists:', !!supabaseUrl)
console.log('Supabase Service Key exists:', !!supabaseServiceKey)

// Create the Supabase client with appropriate role
const supabaseAdmin = createClient(
  supabaseUrl!,
  supabaseServiceKey || supabaseAnonKey!,
  supabaseServiceKey ? {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  } : undefined
)

export { supabaseAdmin } 