"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { Loader2, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface Item {
  id: string
  name: string
  description: string
  quantity: number
  category: string
}

interface Category {
  id: string
  name: string
}

interface DashboardStats {
  totalUsers: number
  totalItems: number
  recentUsers: Array<{
    id: string
    email: string
    created_at: string
  }>
  nextEvent: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isCheckingName, setIsCheckingName] = useState(false)
  const [nameExists, setNameExists] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    quantity: "",
    category: ""
  })

  useEffect(() => {
    fetchData()
    fetchCategories()
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      setIsAdmin(userData?.role === 'admin')
    }
  }

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch total users
      const { count: usersCount, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (usersError) throw usersError

      // Fetch total items
      const { count: itemsCount, error: itemsError } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })

      if (itemsError) throw itemsError

      // Fetch recent users
      const { data: recentUsers, error: recentError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentError) throw recentError

      // Fetch next event
      const { data: eventData, error: eventError } = await supabase
        .from('system_settings')
        .select('next_event')
        .single()

      if (eventError && eventError.code !== 'PGRST116') throw eventError

      setStats({
        totalUsers: usersCount || 0,
        totalItems: itemsCount || 0,
        recentUsers: recentUsers || [],
        nextEvent: eventData?.next_event || 'No upcoming events'
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const checkDuplicateName = async (name: string) => {
    if (!name.trim()) {
      setNameExists(false)
      return
    }

    try {
      setIsCheckingName(true)
      const { data, error } = await supabase
        .from('items')
        .select('id')
        .ilike('name', name)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setNameExists(!!data)
    } catch (error) {
      console.error('Error checking duplicate name:', error)
    } finally {
      setIsCheckingName(false)
    }
  }

  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setNewItem({ ...newItem, name: newName })
    await checkDuplicateName(newName)
  }

  const handleAddItem = async () => {
    if (nameExists) {
      toast({
        title: "Error",
        description: "An item with this name already exists. Please choose a different name.",
        variant: "destructive",
      })
      return
    }

    try {
      if (!newItem.name.trim()) {
        toast({
          title: "Error",
          description: "Item name is required",
          variant: "destructive",
        })
        return
      }

      if (!selectedCategory) {
        toast({
          title: "Error",
          description: "Please select a category",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase
        .from('items')
        .insert([{
          name: newItem.name,
          description: newItem.description,
          quantity: parseInt(newItem.quantity) || 0,
          category: selectedCategory
        }])

      if (error) throw error

      toast({
        title: "Success",
        description: "Item added successfully",
      })

      // Reset form
      setNewItem({
        name: "",
        description: "",
        quantity: "",
        category: ""
      })
      setSelectedCategory("")
      setNameExists(false)
      
      // Refresh data
      fetchData()
    } catch (error) {
      console.error('Error adding item:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add item",
        variant: "destructive",
      })
    }
  }

  const handleAddCategory = async () => {
    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName }])

      if (error) throw error

      toast({
        title: "Success",
        description: "Category added successfully",
      })

      setNewCategoryName("")
      fetchCategories()
    } catch (error) {
      console.error('Error adding category:', error)
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      })
    }
  }

  const handleEventChange = async (event: string) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ next_event: event })

      if (error) throw error

      setStats(prev => prev ? { ...prev, nextEvent: event } : null)
      toast({
        title: "Success",
        description: "Next event updated successfully",
      })
    } catch (error) {
      console.error('Error updating next event:', error)
      toast({
        title: "Error",
        description: "Failed to update next event",
        variant: "destructive",
      })
    }
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
          <h2 className="text-xl md:text-3xl font-bold tracking-tight">Dashboard Overview</h2>
          <p className="text-sm text-muted-foreground">
            Welcome to your inventory management dashboard
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalItems || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Event</CardTitle>
            </CardHeader>
            <CardContent>
              {isAdmin ? (
                <Select value={stats?.nextEvent} onValueChange={handleEventChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select next event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sarasawati Puja">Sarasawati Puja</SelectItem>
                    <SelectItem value="Noboborsho">Noboborsho</SelectItem>
                    <SelectItem value="Durga Puja">Durga Puja</SelectItem>
                    <SelectItem value="Kaali Puja">Kaali Puja</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-2xl font-bold text-green-500">{stats?.nextEvent}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.recentUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <div className="font-medium">{user.email}</div>
                      <div className="text-sm text-muted-foreground">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add New Item</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input 
                          id="name" 
                          placeholder="Enter item name"
                          value={newItem.name}
                          onChange={handleNameChange}
                          className={cn(
                            nameExists && "border-yellow-500 focus-visible:ring-yellow-500"
                          )}
                        />
                        {nameExists && (
                          <p className="text-sm text-yellow-600">
                            An item with this name already exists. Please choose a different name.
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input 
                          id="description" 
                          placeholder="Enter item description"
                          value={newItem.description}
                          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input 
                          id="quantity" 
                          type="number" 
                          placeholder="Enter quantity"
                          value={newItem.quantity}
                          onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <div className="flex gap-2">
                          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.name}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="icon">
                                <Plus className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add New Category</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="newCategory">Category Name</Label>
                                  <Input
                                    id="newCategory"
                                    placeholder="Enter category name"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                  />
                                </div>
                                <Button onClick={handleAddCategory} className="w-full">
                                  Add Category
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      <Button className="w-full" onClick={handleAddItem}>Add Item</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" className="w-full" onClick={() => router.push('/dashboard/inventory')}>
                  View Inventory
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push('/dashboard/users')}>
                  Manage Users
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 