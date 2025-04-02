"use client"

import { useState, useEffect } from "react"
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

interface Category {
  id: string
  name: string
}

export default function NewItemPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [isCheckingName, setIsCheckingName] = useState(false)
  const [nameExists, setNameExists] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    quantity: 0,
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    const checkName = async () => {
      if (!formData.name.trim()) {
        setNameExists(false)
        return
      }

      setIsCheckingName(true)
      try {
        const { data: existingItems, error: checkError } = await supabase
          .from("items")
          .select("name")
          .ilike("name", formData.name)

        if (checkError) throw checkError

        setNameExists(existingItems && existingItems.length > 0)
      } catch (error) {
        console.error("Error checking name:", error)
      } finally {
        setIsCheckingName(false)
      }
    }

    // Debounce the check to avoid too many API calls
    const timeoutId = setTimeout(checkName, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.name])

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
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from("items")
        .insert([formData])

      if (error) throw error

      router.push("/dashboard/inventory")
    } catch (error) {
      console.error("Error creating item:", error)
      setError(error instanceof Error ? error.message : "Failed to create item")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Add New Item</h2>
        <p className="text-muted-foreground">
          Add a new item to your inventory
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
          <CardDescription>
            Enter the item's information below
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
                className={nameExists ? "border-yellow-500" : ""}
              />
              {isCheckingName && (
                <p className="text-sm text-muted-foreground">Checking name availability...</p>
              )}
              {nameExists && (
                <p className="text-sm text-yellow-600">
                  An item with this name already exists. You can still create another one.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter item description"
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

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/inventory")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Item"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 