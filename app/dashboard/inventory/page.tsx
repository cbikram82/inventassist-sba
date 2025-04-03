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

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userError) throw userError
      setUserRole(userData.role)
      fetchItems()
      fetchCategories()
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/login')
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

  const handleAddItem = async () => {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
        <div>
          <h2 className="text-xl md:text-3xl font-bold tracking-tight">Inventory</h2>
          <p className="text-sm text-muted-foreground">
            Manage your inventory items
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
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
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  />
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
                </div>
                <Button className="w-full" onClick={handleAddItem}>Add Item</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto">
            <FileDown className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <FileUp className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Import Items</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>CSV Template</Label>
                  <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                    <FileDown className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Upload CSV</Label>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="cursor-pointer"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Required columns:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Name</li>
                    <li>Description</li>
                    <li>Quantity</li>
                    <li>Category</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div className="w-full">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="hidden sm:table-cell font-semibold">Description</TableHead>
                  <TableHead className="font-semibold text-center">Qty</TableHead>
                  <TableHead className="hidden sm:table-cell font-semibold">Category</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{item.name}</span>
                        <span className="sm:hidden text-sm text-muted-foreground">
                          {item.description}
                        </span>
                        <span className="sm:hidden text-sm text-muted-foreground">
                          {item.category}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {item.description}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-medium",
                        item.quantity === 0 ? "bg-red-100 text-red-700" :
                        item.quantity <= 10 ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      )}>
                        {item.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {item.category}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/inventory/${item.id}`}>
                          Edit
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
} 