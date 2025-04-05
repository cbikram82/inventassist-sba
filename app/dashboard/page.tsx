"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { Loader2, Plus, Users, Package, BarChart, AlertTriangle, LayoutGrid, Calendar } from "lucide-react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Item {
  id: string
  name: string
  description: string
  quantity: number
  category: string
  location: string
  person_name?: string
}

interface Category {
  id: string
  name: string
}

interface DashboardStats {
  totalUsers: number
  totalItems: number
  totalCategories: number
  nextEvent: string
  recentUsers: Array<{
    id: string
    email: string
    role: string
    last_activity: string | null
    last_sign_in_at: string | null
  }>
  lowStockItems: Array<{ id: string; name: string; quantity: number }>
  outOfStockItems: number
}

interface EventItem {
  id: string
  item_id: string
  item_name: string
  quantity: number
  event_name: string
  created_at: string
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
  const [userRole, setUserRole] = useState<string>("")
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    quantity: "",
    category: "",
    location: "Safestore",
    person_name: ""
  })
  const [lowStockItems, setLowStockItems] = useState<Array<{ id: string; name: string; quantity: number }>>([])
  const [selectedNextEvent, setSelectedNextEvent] = useState<string>("")
  const [eventItems, setEventItems] = useState<EventItem[]>([])
  const [availableEvents] = useState([
    "Sarasawati Puja",
    "Noboborsho",
    "Durga Puja",
    "Kaali Puja"
  ])
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    fetchData()
    fetchCategories()
    checkAdminStatus()
    fetchLowStockItems()
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
      setUserRole(userData?.role || '')
    }
  }

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch all items
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .order('name')

      if (itemsError) throw itemsError

      // Fetch total users
      const { count: usersCount, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (usersError) throw usersError

      // Fetch total items
      const { count: itemsCount, error: itemsCountError } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })

      if (itemsCountError) throw itemsCountError

      // Fetch total categories
      const { count: categoriesCount, error: categoriesError } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })

      if (categoriesError) throw categoriesError

      // Fetch low stock items
      const { data: lowStockItems, error: lowStockError } = await supabase
        .from('items')
        .select('*')
        .lt('quantity', 5)
        .eq('exclude_from_low_stock', false)
        .order('quantity')

      if (lowStockError) throw lowStockError

      // Fetch event items if an event is selected
      if (selectedNextEvent) {
        const { data: eventItemsData, error: eventItemsError } = await supabase
          .from('event_items')
          .select('*')
          .eq('event_name', selectedNextEvent)
          .order('created_at', { ascending: false })

        if (eventItemsError) throw eventItemsError
        setEventItems(eventItemsData || [])
      }

      setItems(itemsData || [])
      setStats({
        totalUsers: usersCount || 0,
        totalItems: itemsCount || 0,
        totalCategories: categoriesCount || 0,
        nextEvent: selectedNextEvent || 'No upcoming events',
        recentUsers: [],
        lowStockItems: lowStockItems || [],
        outOfStockItems: 0
      })
      setLowStockItems(lowStockItems || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data')
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

      if (newItem.location === 'Home' && !newItem.person_name?.trim()) {
        toast({
          title: "Error",
          description: "Person name is required when location is Home",
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
          category: selectedCategory,
          location: newItem.location,
          person_name: newItem.location === 'Home' ? newItem.person_name : null
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
        category: "",
        location: "Safestore",
        person_name: ""
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

  const fetchLowStockItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .or('quantity.eq.0,quantity.lte.10')
        .eq('exclude_from_low_stock', false)
        .order('quantity', { ascending: true })
        .limit(5)

      if (error) throw error
      setLowStockItems(data || [])
    } catch (error) {
      console.error('Error fetching low stock items:', error)
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Items
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalItems || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Categories
              </CardTitle>
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCategories || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Next Event
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Select value={selectedNextEvent} onValueChange={setSelectedNextEvent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select next event" />
                </SelectTrigger>
                <SelectContent>
                  {availableEvents.map(event => (
                    <SelectItem key={event} value={event}>
                      {event}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {selectedNextEvent && (
          <Card>
            <CardHeader>
              <CardTitle>{selectedNextEvent} Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventItems.map((eventItem) => {
                    const originalItem = items.find(item => item.id === eventItem.item_id)
                    const remaining = originalItem ? originalItem.quantity - eventItem.quantity : 0
                    
                    return (
                      <TableRow key={eventItem.id}>
                        <TableCell>{eventItem.item_name}</TableCell>
                        <TableCell>{eventItem.quantity}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            remaining <= 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                          )}>
                            {remaining}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {eventItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">
                        No items found for {selectedNextEvent}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.recentUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <div className="font-medium">{user.email}</div>
                        <div className="text-sm text-muted-foreground">
                          Role: {user.role} • Joined {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          user.last_sign_in_at ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        )}>
                          {user.last_sign_in_at ? "Active" : "Inactive"}
                        </div>
                        {user.last_sign_in_at && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Last active: {new Date(user.last_sign_in_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Low Stock Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockItems.map((item: { id: string; name: string; quantity: number }) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Quantity: {item.quantity}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        item.quantity === 0 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                      )}>
                        {item.quantity === 0 ? "Out of Stock" : "Low Stock"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(isAdmin || userRole === 'editor') && (
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
                          <Label htmlFor="location">Location</Label>
                          <Select 
                            value={newItem.location} 
                            onValueChange={(value) => setNewItem({ ...newItem, location: value, person_name: "" })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Safestore">Safestore</SelectItem>
                              <SelectItem value="Home">Home</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {newItem.location === 'Home' && (
                          <div className="space-y-2">
                            <Label htmlFor="person_name">Person Name</Label>
                            <Input 
                              id="person_name" 
                              placeholder="Enter person name"
                              value={newItem.person_name}
                              onChange={(e) => setNewItem({ ...newItem, person_name: e.target.value })}
                            />
                          </div>
                        )}
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
                            {isAdmin && (
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
                            )}
                          </div>
                        </div>
                        <Button className="w-full" onClick={handleAddItem}>Add Item</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                <Button variant="outline" className="w-full" onClick={() => router.push('/dashboard/inventory')}>
                  View Inventory
                </Button>
                {isAdmin && (
                  <Button variant="outline" className="w-full" onClick={() => router.push('/dashboard/users')}>
                    Manage Users
                  </Button>
                )}
                {(isAdmin || userRole === 'editor') && (
                  <>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={async () => {
                        try {
                          const { data, error } = await supabase
                            .from('items')
                            .select('*')
                            .order('name')

                          if (error) throw error

                          const csv = [
                            ['Name', 'Description', 'Quantity', 'Category'],
                            ...data.map(item => [
                              item.name,
                              item.description,
                              item.quantity,
                              item.category
                            ])
                          ].map(row => row.join(',')).join('\n')

                          const blob = new Blob([csv], { type: 'text/csv' })
                          const url = window.URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = 'inventory.csv'
                          document.body.appendChild(a)
                          a.click()
                          window.URL.revokeObjectURL(url)
                          document.body.removeChild(a)

                          toast({
                            title: "Success",
                            description: "Inventory exported successfully",
                          })
                        } catch (error) {
                          console.error('Error exporting inventory:', error)
                          toast({
                            title: "Error",
                            description: "Failed to export inventory",
                            variant: "destructive",
                          })
                        }
                      }}
                    >
                      Export CSV
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          Import CSV
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Import Inventory</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="csvFile">CSV File</Label>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const template = [
                                    ['Name', 'Description', 'Quantity', 'Category'],
                                    ['Example Item', 'This is an example item', '10', 'Electronics'],
                                    ['Another Item', 'Another example item', '5', 'Furniture']
                                  ].map(row => row.join(',')).join('\n')

                                  const blob = new Blob([template], { type: 'text/csv' })
                                  const url = window.URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = 'inventory_template.csv'
                                  document.body.appendChild(a)
                                  a.click()
                                  window.URL.revokeObjectURL(url)
                                  document.body.removeChild(a)
                                }}
                              >
                                Download Template
                              </Button>
                            </div>
                            <Input
                              id="csvFile"
                              type="file"
                              accept=".csv"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return

                                try {
                                  const text = await file.text()
                                  const rows = text.split('\n').map(row => row.split(','))
                                  const headers = rows[0]
                                  const data = rows.slice(1).filter(row => row.length === headers.length)

                                  const items = data.map(row => ({
                                    name: row[0],
                                    description: row[1],
                                    quantity: parseInt(row[2]) || 0,
                                    category: row[3]
                                  }))

                                  const { error } = await supabase
                                    .from('items')
                                    .upsert(items, { onConflict: 'name' })

                                  if (error) throw error

                                  toast({
                                    title: "Success",
                                    description: "Inventory imported successfully",
                                  })

                                  fetchData()
                                } catch (error) {
                                  console.error('Error importing inventory:', error)
                                  toast({
                                    title: "Error",
                                    description: "Failed to import inventory. Please check the file format.",
                                    variant: "destructive",
                                  })
                                }
                              }}
                            />
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 