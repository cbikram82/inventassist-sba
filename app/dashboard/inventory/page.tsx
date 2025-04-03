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

interface Item {
  id: string
  name: string
  description: string
  quantity: number
  category: string
  created_at: string
}

export default function InventoryPage() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        router.push('/login')
        return
      }

      if (!session) {
        console.log('No session found, redirecting to login')
        router.push('/login')
        return
      }

      // If we have a valid session, fetch the items
      fetchItems()
      fetchCategories()
    } catch (error) {
      console.error('Auth check error:', error)
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
        .from('items')
        .select('category')
        .not('category', 'is', null)

      if (error) throw error

      const uniqueCategories = Array.from(new Set(data.map(item => item.category)))
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return

    try {
      setCategories([...categories, newCategory])
      setNewCategory("")
    } catch (error) {
      console.error('Error adding category:', error)
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
                  <Input id="name" placeholder="Enter item name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" placeholder="Enter item description" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" type="number" placeholder="Enter quantity" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <div className="flex gap-2">
                    <Input id="category" placeholder="Enter category" />
                    <Button variant="outline" onClick={handleAddCategory}>Add</Button>
                  </div>
                  <ScrollArea className="h-[100px] mt-2">
                    <div className="space-y-1">
                      {categories.map((category) => (
                        <div key={category} className="flex items-center justify-between p-2 border rounded text-sm">
                          <span>{category}</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <span className="sr-only">Select category</span>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <Button className="w-full">Add Item</Button>
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
          <div className="min-w-[600px] md:min-w-[800px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[140px] sm:w-[180px] md:w-[200px] font-semibold">Name</TableHead>
                  <TableHead className="w-[160px] sm:w-[200px] md:w-[300px] font-semibold">Description</TableHead>
                  <TableHead className="w-[60px] sm:w-[80px] md:w-[100px] font-semibold text-center">Qty</TableHead>
                  <TableHead className="w-[100px] sm:w-[120px] md:w-[150px] font-semibold">Category</TableHead>
                  <TableHead className="w-[60px] sm:w-[80px] md:w-[100px] font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium truncate max-w-[140px] sm:max-w-[180px] md:max-w-[200px]">
                      {item.name}
                    </TableCell>
                    <TableCell className="truncate max-w-[160px] sm:max-w-[200px] md:max-w-[300px]">
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
                    <TableCell className="truncate max-w-[100px] sm:max-w-[120px] md:max-w-[150px]">
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