"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, FileUp, FileDown, Search } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

// Configure page to be dynamic and not cached
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

interface Item {
  id: string
  name: string
  description: string
  quantity: number
  category: string
  location: string
  person_name?: string
  exclude_from_low_stock: boolean
}

interface Category {
  id: string
  name: string
}

interface User {
  id: string
  role: string
}

export default function InventoryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [userRole, setUserRole] = useState<string>("")
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    quantity: "",
    category: "",
    location: "Safestore",
    person_name: "",
    exclude_from_low_stock: false
  })
  const [isCheckingName, setIsCheckingName] = useState(false)
  const [nameExists, setNameExists] = useState(false)
  const [isDeletingItem, setIsDeletingItem] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)

  useEffect(() => {
    fetchItems()
    fetchCategories()
    checkUserRole()
  }, [])

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      setUserRole(userData?.role || '')
    }
  }

  const fetchItems = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching items:', error)
      setError(error instanceof Error ? error.message : 'Failed to load items')
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
      setIsAddingItem(true)

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
          description: "Person name is required when location is set to Home",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase
        .from('items')
        .insert([{
          name: newItem.name,
          description: newItem.description?.trim() || null,
          quantity: parseInt(newItem.quantity) || 0,
          category: selectedCategory,
          location: newItem.location,
          person_name: newItem.location === 'Home' ? newItem.person_name : null,
          exclude_from_low_stock: newItem.exclude_from_low_stock
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
        person_name: "",
        exclude_from_low_stock: false
      })
      setSelectedCategory("")
      setNameExists(false)
      
      // Close dialog
      setIsAddItemDialogOpen(false)
      
      // Refresh data
      fetchItems()
    } catch (error) {
      console.error('Error adding item:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add item",
        variant: "destructive",
      })
    } finally {
      setIsAddingItem(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (userRole !== 'admin' && userRole !== 'editor') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete items",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Item deleted successfully",
      })

      fetchItems()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  const handleAddCategory = async () => {
    if (userRole !== 'admin' && userRole !== 'editor') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to add categories",
        variant: "destructive",
      })
      return
    }

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
      setIsAddingCategory(false)
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

  const handleExportCSV = () => {
    const headers = ['Name', 'Description', 'Quantity', 'Category']
    const csvContent = [
      headers.join(','),
      ...items.map(item => [
        item.name,
        item.description,
        item.quantity,
        item.category
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'inventory.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const rows = text.split('\n')
      const headers = rows[0].split(',')
      const items = rows.slice(1).map(row => {
        const values = row.split(',')
        return {
          name: values[0],
          description: values[1],
          quantity: parseInt(values[2]),
          category: values[3]
        }
      })

      const { error } = await supabase
        .from('items')
        .insert(items)

      if (error) throw error

      fetchItems()
    } catch (error) {
      console.error('Error importing CSV:', error)
      setError(error instanceof Error ? error.message : 'Failed to import CSV')
    }
  }

  const handleDownloadTemplate = () => {
    const headers = ['Name', 'Description', 'Quantity', 'Category']
    const template = [
      headers.join(','),
      'Example Item,This is a sample item description,10,Electronics',
      'Another Item,Another sample description,5,Office Supplies'
    ].join('\n')

    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'inventory-template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleUpdate = async (item: Item) => {
    try {
      setIsUpdating(true)
      setError(null)

      // First, get the current version of the item
      const { data: currentItem, error: fetchError } = await supabase
        .from('items')
        .select('version')
        .eq('id', item.id)
        .single()

      if (fetchError) throw fetchError

      // Update the item with version check
      const { error: updateError } = await supabase
        .from('items')
        .update({
          name: item.name,
          description: item.description,
          category: item.category,
          quantity: item.quantity,
          location: item.location,
          person_name: item.location === 'Home' ? item.person_name : null,
          exclude_from_low_stock: item.exclude_from_low_stock,
          version: (currentItem?.version || 0) + 1
        })
        .eq('id', item.id)
        .eq('version', currentItem?.version || 0) // Only update if version matches

      if (updateError) {
        if (updateError.code === 'PGRST116') {
          // This error code indicates the version check failed
          throw new Error('This item was modified by another user. Please refresh and try again.')
        }
        throw updateError
      }

      toast({
        title: "Success",
        description: "Item updated successfully",
      })

      // Refresh the items list
      await fetchItems()
    } catch (error) {
      console.error('Error updating item:', error)
      setError(error instanceof Error ? error.message : 'Failed to update item')
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update item",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Filter items based on search query and category
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.description ? item.description.toLowerCase().includes(searchQuery.toLowerCase()) : false)
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-3 md:space-y-6 md:p-6">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl md:text-3xl font-bold tracking-tight">Inventory Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage your inventory items and categories
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(userRole === 'admin' || userRole === 'editor') && (
              <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
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
                        <Select 
                          value={selectedCategory} 
                          onValueChange={setSelectedCategory}
                          required
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.length > 0 ? (
                              categories.map((category) => (
                                <SelectItem key={category.id} value={category.name}>
                                  {category.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="" disabled>
                                No categories available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {(userRole === 'admin' || userRole === 'editor') && (
                          <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
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
                                <Button 
                                  className="w-full" 
                                  onClick={handleAddCategory}
                                >
                                  Add Category
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
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
                    <div className="flex items-center space-x-2 py-2 border-t">
                      <Switch
                        id="exclude-from-low-stock"
                        checked={newItem.exclude_from_low_stock}
                        onCheckedChange={(checked) => setNewItem({ ...newItem, exclude_from_low_stock: checked })}
                        className="data-[state=checked]:bg-inventassist-orange"
                      />
                      <Label htmlFor="exclude-from-low-stock" className="text-sm font-medium">
                        Exclude from low stock display
                      </Label>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={handleAddItem}
                      disabled={isAddingItem}
                    >
                      {isAddingItem ? "Adding..." : "Add Item"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[800px]">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium">Name</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Description</th>
                      <th className="h-12 px-4 text-center align-middle font-medium">Category</th>
                      <th className="h-12 px-4 text-center align-middle font-medium">Location</th>
                      <th className="h-12 px-4 text-center align-middle font-medium">Quantity</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-muted-foreground">
                          No items found
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map(item => (
                        <tr key={item.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <td className="p-4 align-middle">
                            <div className="font-medium">{item.name}</div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="text-muted-foreground">{item.description}</div>
                          </td>
                          <td className="p-4 align-middle text-center">
                            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                              {item.category}
                            </div>
                          </td>
                          <td className="p-4 align-middle text-center">
                            <div className="flex flex-col items-center">
                              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                {item.location}
                              </div>
                              {item.location === 'Home' && item.person_name && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {item.person_name}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 align-middle text-center">
                            <div className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              item.quantity === 0 ? "bg-red-100 text-red-700" :
                              item.quantity <= 10 ? "bg-yellow-100 text-yellow-700" :
                              "bg-green-100 text-green-700"
                            )}>
                              {item.quantity}
                            </div>
                          </td>
                          <td className="p-4 align-middle text-right">
                            <div className="flex justify-end gap-2">
                              {(userRole === 'admin' || userRole === 'editor') && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                  >
                                    <Link href={`/dashboard/inventory/${item.id}`}>
                                      Edit
                                    </Link>
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDelete(item.id)}
                                  >
                                    Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 