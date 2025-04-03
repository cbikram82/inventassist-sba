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

interface Item {
  id: string
  name: string
  description: string
  quantity: number
  category: string
  created_at: string
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
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    quantity: "",
    category: ""
  })
  const [isCheckingName, setIsCheckingName] = useState(false)
  const [nameExists, setNameExists] = useState(false)

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
      
      // Refresh items
      fetchItems()
    } catch (error) {
      console.error('Error adding item:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add item",
        variant: "destructive",
      })
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

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(userRole === 'admin' || userRole === 'editor') && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
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
                        {userRole === 'admin' && (
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
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead className="hidden md:table-cell">Description</TableHead>
                      <TableHead className="w-[100px]">Category</TableHead>
                      <TableHead className="w-[100px] text-right">Quantity</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="hidden md:table-cell max-w-[300px] truncate">
                          {item.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-medium",
                            item.quantity === 0 ? "text-red-500" :
                            item.quantity <= 10 ? "text-yellow-500" :
                            "text-green-500"
                          )}>
                            {item.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {(userRole === 'admin' || userRole === 'editor') && (
                            <div className="flex justify-end gap-2">
                              <Link href={`/dashboard/inventory/${item.id}`}>
                                <Button variant="outline" size="sm">
                                  Edit
                                </Button>
                              </Link>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(item.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No items found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 