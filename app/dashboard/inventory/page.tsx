"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { Plus, Search, Pencil, Trash2, FolderPlus, Download, Upload } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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

export default function InventoryPage() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)

  useEffect(() => {
    fetchItems()
    fetchCategories()
  }, [])

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error("Error fetching items:", error)
      setError("Failed to load items")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return

    try {
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", id)

      if (error) throw error
      fetchItems()
    } catch (error) {
      console.error("Error deleting item:", error)
      setError("Failed to delete item")
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      const { error } = await supabase
        .from("categories")
        .insert([{ name: newCategoryName.trim() }])

      if (error) throw error
      setNewCategoryName("")
      setIsAddingCategory(false)
      fetchCategories()
    } catch (error) {
      console.error("Error adding category:", error)
      setError("Failed to add category")
    }
  }

  const handleExportCSV = () => {
    const headers = ["Name", "Description", "Category", "Quantity"]
    const csvContent = [
      headers.join(","),
      ...items.map(item => [
        `"${item.name}"`,
        `"${item.description}"`,
        `"${item.category}"`,
        item.quantity
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `inventory-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportFile(file)
    setIsImporting(true)
    setError(null)

    try {
      const text = await file.text()
      const rows = text.split("\n").map(row => row.split(",").map(cell => cell.trim().replace(/^"|"$/g, "")))
      const headers = rows[0]
      const data = rows.slice(1).filter(row => row.length === headers.length)

      const itemsToImport = data.map(row => ({
        name: row[0],
        description: row[1],
        category: row[2],
        quantity: parseInt(row[3]) || 0
      }))

      const { error } = await supabase
        .from("items")
        .insert(itemsToImport)

      if (error) throw error

      await fetchItems()
      setImportFile(null)
    } catch (error) {
      console.error("Error importing items:", error)
      setError("Failed to import items. Please check the CSV format.")
    } finally {
      setIsImporting(false)
    }
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
          <p className="text-muted-foreground">
            Manage your inventory items
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
              id="import-csv"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById("import-csv")?.click()}
              disabled={isImporting}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isImporting ? "Importing..." : "Import CSV"}
            </Button>
          </div>
          <Button onClick={() => router.push("/dashboard/inventory/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>
            A list of all items in your inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
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
            <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Category</DialogTitle>
                  <DialogDescription>
                    Enter a name for the new category
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="categoryName">Category Name</Label>
                  <Input
                    id="categoryName"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter category name"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleAddCategory}>Add Category</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Items</DialogTitle>
                  <DialogDescription>
                    Import items from a CSV file
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">CSV Template</h4>
                      <p className="text-sm text-muted-foreground">
                        Download the template to see the required format
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleExportCSV}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Template
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="importFile">CSV File</Label>
                    <Input
                      id="importFile"
                      type="file"
                      accept=".csv"
                      onChange={handleImportCSV}
                      disabled={isImporting}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => document.getElementById("importFile")?.click()} disabled={isImporting}>
                    {isImporting ? "Importing..." : "Import"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/dashboard/inventory/${item.id}`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 