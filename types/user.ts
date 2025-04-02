export type UserRole = 'admin' | 'editor' | 'viewer'

export interface User {
  id: string
  email: string
  role: UserRole
  name?: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  isLoading: boolean
} 