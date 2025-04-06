"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"

interface Item {
  id: string
  name: string
  description: string
  category: string
  quantity: number
  location: string
  person_name?: string
  exclude_from_low_stock: boolean
}

interface Category {
  id: string
  name: string
}

export default function EditItemPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState<Item>({
    id: "",
    name: "",
    description: "",
    category: "",
    quantity: 0,
    location: "",
    exclude_from_low_stock: false,
  })

  useEffect(() => {
    fetchItem()
    fetchCategories()
  }, [params.id])

  const fetchItem = async () => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", params.id)
        .single()

      if (error) throw error
      if (!data) throw new Error("Item not found")

      setFormData(data)
    } catch (error) {
      console.error("Error fetching item:", error)
      setError(error instanceof Error ? error.message : "Failed to load item")
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        setError("Item name is required")
        return
      }

      if (!formData.category) {
        setError("Category is required")
        return
      }

      if (formData.location === 'Home' && !formData.person_name?.trim()) {
        setError("Person name is required when location is Home")
        return
      }

      // Prepare update data
      const updateData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null, // Make description optional
        quantity: formData.quantity,
        category: formData.category,
        location: formData.location,
        person_name: formData.location === 'Home' ? formData.person_name?.trim() : null,
        exclude_from_low_stock: formData.exclude_from_low_stock
      }

      const { error } = await supabase
        .from('items')
        .update(updateData)
        .eq('id', params.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Item updated successfully",
      })

      router.push('/dashboard/inventory')
    } catch (error) {
      console.error("Error updating item:", error)
      setError(error instanceof Error ? error.message : "Failed to update item")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Edit Item</h2>
        <p className="text-muted-foreground">
          Update item details
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
          <CardDescription>
            Update the item's information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
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

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select
                value={formData.location}
                onValueChange={(value) => setFormData({ ...formData, location: value })}
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

            {formData.location === 'Home' && (
              <div className="space-y-2">
                <Label htmlFor="person_name">Person Name</Label>
                <Input
                  id="person_name"
                  value={formData.person_name || ""}
                  onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="exclude-from-low-stock"
                checked={formData.exclude_from_low_stock}
                onCheckedChange={(checked) => setFormData({ ...formData, exclude_from_low_stock: checked })}
              />
              <Label htmlFor="exclude-from-low-stock" className="text-sm">
                Exclude from low stock display
              </Label>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/inventory")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 