"use client"

import { useState, useEffect } from "react"
import { Download, Plus, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InventoryTable } from "./inventory-table"
import { ItemForm } from "./item-form"
import { ImportInventory } from "./import-inventory"
import type { InventoryItem } from "@/types/inventory"
import { getInventoryItems, deleteInventoryItem } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { exportToCSV } from "@/lib/csv-export"

export function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Load items from Supabase on component mount
  useEffect(() => {
    async function loadItems() {
      setIsLoading(true)
      setError(null)

      try {
        const { items, error } = await getInventoryItems()

        if (error) {
          setError(`Failed to load inventory items: ${error}`)
          toast({
            title: "Error",
            description: `Failed to load inventory items: ${error}`,
            variant: "destructive",
          })
        } else {
          setItems(items)
        }
      } catch (err) {
        setError("Failed to connect to the database. Please check your connection.")
        toast({
          title: "Error",
          description: "Failed to connect to the database",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadItems()
  }, [toast])

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const { success, error } = await deleteInventoryItem(id)

      if (success) {
        setItems(items.filter((item) => item.id !== id))
        toast({
          title: "Success",
          description: "Item deleted successfully",
        })
      } else {
        toast({
          title: "Error",
          description: `Failed to delete item: ${error}`,
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to connect to the database",
        variant: "destructive",
      })
    }
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingItem(null)
  }

  const handleExport = () => {
    try {
      // Use filtered items if there's a search query, otherwise use all items
      const itemsToExport = searchQuery ? filteredItems : items

      // Generate filename with current date
      const date = new Date().toISOString().split("T")[0] // YYYY-MM-DD format
      const filename = `sba-inventory-${date}.csv`

      exportToCSV(itemsToExport, filename)

      toast({
        title: "Success",
        description: "Inventory exported successfully",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to export inventory",
        variant: "destructive",
      })
    }
  }

  const handleImportComplete = (importedItems: InventoryItem[]) => {
    setItems((prevItems) => [...prevItems, ...importedItems])
    toast({
      title: "Import Complete",
      description: `Added ${importedItems.length} new items to inventory.`,
    })
  }

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase() || ""),
  )

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-2">
              <p className="text-sm mb-2">
                Please make sure you've created the 'inventory_items' table in your Supabase database.
              </p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <Input
          placeholder="Search inventory..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)} disabled={isLoading}>
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={isLoading || items.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button
            onClick={() => setIsFormOpen(true)}
            className="bg-inventassist-orange hover:bg-inventassist-orange/90"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      <InventoryTable items={filteredItems} onEdit={handleEdit} onDelete={handleDelete} isLoading={isLoading} />

      {isFormOpen && (
        <ItemForm
          onCancel={handleFormClose}
          initialData={editingItem}
          onSuccess={(newItem) => {
            if (editingItem) {
              setItems(items.map((item) => (item.id === newItem.id ? newItem : item)))
            } else {
              setItems([...items, newItem])
            }
            handleFormClose()
          }}
        />
      )}

      <ImportInventory open={isImportOpen} onOpenChange={setIsImportOpen} onImportComplete={handleImportComplete} />
    </div>
  )
}

