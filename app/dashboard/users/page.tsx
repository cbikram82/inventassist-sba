"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"

interface User {
  id: string
  email: string
  role: string
  created_at: string
}

export default function UsersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    role: "viewer"
  })
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isDeletingUser, setIsDeletingUser] = useState(false)

  useEffect(() => {
    fetchUsers()
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      setIsAdmin(userData?.role === 'admin')
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreatingUser(true)
      
      // Create the auth user first
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (signUpError) {
        console.error('Sign up error:', signUpError)
        if (signUpError.message.includes('already registered')) {
          toast({
            title: "Error",
            description: "A user with this email already exists",
            variant: "destructive",
          })
          return
        }
        throw signUpError
      }

      if (!user || !user.email) {
        throw new Error("Failed to create user")
      }

      // Create the user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert([{
          id: user.id,
          email: user.email,
          role: newUser.role,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // If profile creation fails, we should clean up the auth user
        await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id }),
        })
        throw profileError
      }

      if (!profileData) {
        throw new Error("Failed to create user profile")
      }

      // Update local state immediately
      setUsers(prevUsers => [profileData, ...prevUsers])

      toast({
        title: "Success",
        description: "User created successfully. They can now log in with their email and password.",
      })

      // Reset form
      setNewUser({
        email: "",
        password: "",
        role: "viewer"
      })
    } catch (error) {
      console.error('Error creating user:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      })
    } finally {
      setIsCreatingUser(false)
    }
  }

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession()

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // If we have a session, ensure the current user's data is up to date
      if (session?.user) {
        const currentUser = data?.find(user => user.id === session.user.id)
        if (currentUser) {
          setUsers(data || [])
        } else {
          // If current user not found in the list, add them
          setUsers([{
            id: session.user.id,
            email: session.user.email || '',
            role: 'viewer',
            created_at: new Date().toISOString()
          }, ...(data || [])])
        }
      } else {
        setUsers(data || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setError(error instanceof Error ? error.message : 'Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      toast({
        title: "Success",
        description: "User role updated successfully",
      })

      fetchUsers()
    } catch (error) {
      console.error('Error updating user role:', error)
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      setIsDeletingUser(true)

      // First, delete the user from the users table
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete.id)

      if (dbError) throw dbError

      // Then, delete the user from auth.users using the service role
      const { error: authError } = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userToDelete.id }),
      }).then(res => res.json())

      if (authError) throw authError

      // Update local state immediately
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userToDelete.id))
      setUserToDelete(null)

      toast({
        title: "Success",
        description: "User deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      })
    } finally {
      setIsDeletingUser(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  if (!isAdmin) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-3 md:space-y-6 md:p-6">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl md:text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage user accounts and roles (Admin Only)
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            {isAdmin && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreateUser} disabled={isCreatingUser} className="w-full">
                      {isCreatingUser ? "Creating..." : "Create User"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users found</p>
              ) : (
                filteredUsers.map(user => (
                  <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/50 rounded-lg gap-4">
                    <div>
                      <div className="font-medium">{user.email}</div>
                      <div className="text-sm text-muted-foreground">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.id, value)}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      {isAdmin && user.id !== currentUserId && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="icon"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete User</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete {user.email}? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setUserToDelete(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => {
                                  setUserToDelete(user);
                                  handleDeleteUser();
                                }}
                                disabled={isDeletingUser}
                              >
                                {isDeletingUser ? "Deleting..." : "Delete"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 