import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Log environment variables (without exposing sensitive values)
console.log('Supabase URL exists:', !!supabaseUrl)
console.log('Supabase Anon Key exists:', !!supabaseAnonKey)

// Create a dummy client if environment variables are missing
const createDummyClient = () => {
  console.warn('Supabase environment variables are missing. Using dummy client.')
  return {
    auth: {
      signUp: async () => ({ error: new Error('Supabase is not configured') }),
      signIn: async () => ({ error: new Error('Supabase is not configured') }),
      signOut: async () => ({ error: new Error('Supabase is not configured') }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: async () => ({ data: null, error: new Error('Supabase is not configured') }),
      insert: async () => ({ data: null, error: new Error('Supabase is not configured') }),
      update: async () => ({ data: null, error: new Error('Supabase is not configured') }),
      delete: async () => ({ data: null, error: new Error('Supabase is not configured') }),
    }),
  }
}

// Create the Supabase client with improved session handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: {
      getItem: (key) => {
        if (typeof window !== 'undefined') {
          try {
            return localStorage.getItem(key)
          } catch (error) {
            console.error('Error reading from localStorage:', error)
            return null
          }
        }
        return null
      },
      setItem: (key, value) => {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(key, value)
          } catch (error) {
            console.error('Error writing to localStorage:', error)
          }
        }
      },
      removeItem: (key) => {
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(key)
          } catch (error) {
            console.error('Error removing from localStorage:', error)
          }
        }
      },
    },
    flowType: 'pkce',
    debug: process.env.NODE_ENV === 'development',
  },
  global: {
    headers: {
      'x-application-name': 'inventassist-sba',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Helper function to check if we have a valid session
export const checkValidSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Session error:', error)
      return false
    }

    if (!session) {
      return false
    }

    // Check if the session is expired
    const expiresAt = new Date(session.expires_at || 0).getTime()
    const now = new Date().getTime()
    
    if (expiresAt <= now) {
      return false
    }

    return true
  } catch (error) {
    console.error('Error checking session:', error)
    return false
  }
}

