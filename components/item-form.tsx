"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import type { InventoryItem } from "@/types/inventory"
import { addInventoryItem, updateInventoryItem } from "@/app/actions"
import { CategorySelector } from "./category-selector"
import { DatePicker } from "./ui/date-picker"

interface ItemFormProps {
  onCancel: () => void
  onSuccess: (item: InventoryItem) => void
  initialData: InventoryItem | null
}

export function ItemForm({ onCancel, onSuccess, initialData }: ItemFormProps) {
  const [formData, setFormData] = useState<Omit<InventoryItem, "id">>({
    name: initialData?.name || "",
    quantity: initialData?.quantity || 0,
    category: initialData?.category || "",
    price: initialData?.price || 0,
    description: initialData?.description || "",
    date: initialData?.date || new Date().toISOString().split("T")[0], // Default to today
  })

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialData?.date ? new Date(initialData.date) : new Date(),
  )

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: name === "quantity" || name === "price" ? Number.parseFloat(value) || 0 : value,
    })

    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      })
    }
  }

  const handleCategoryChange = (category: string) => {
    setFormData({
      ...formData,
      category,
    })

    // Clear error when category is selected
    if (errors.category) {
      setErrors({
        ...errors,
        category: "",
      })
    }
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      setFormData({
        ...formData,
        date: date.toISOString().split("T")[0], // Format as YYYY-MM-DD
      })

      // Clear error when date is selected
      if (errors.date) {
        setErrors({
          ...errors,
          date: "",
        })
      }
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!formData.category.trim()) {
      newErrors.category = "Category is required"
    }

    if (formData.quantity < 0) {
      newErrors.quantity = "Quantity cannot be negative"
    }

    if (formData.price < 0) {
      newErrors.price = "Price cannot be negative"
    }

    if (!formData.date) {
      newErrors.date = "Date is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      if (initialData) {
        // Update existing item
        const { success, item, error } = await updateInventoryItem({
          ...formData,
          id: initialData.id,
        })

        if (success && item) {
          toast({
            title: "Success",
            description: "Item updated successfully",
          })
          onSuccess(item)
        } else {
          toast({
            title: "Error",
            description: `Failed to update item: ${error}`,
            variant: "destructive",
          })
        }
      } else {
        // Add new item
        const { success, item, error } = await addInventoryItem(formData)

        if (success && item) {
          toast({
            title: "Success",
            description: "Item added successfully",
          })
          onSuccess(item)
        } else {
          toast({
            title: "Error",
            description: `Failed to add item: ${error}`,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Item" : "Add New Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Item name"
              disabled={isSubmitting}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <CategorySelector value={formData.category} onChange={handleCategoryChange} disabled={isSubmitting} />
            {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                min="0"
                step="1"
                disabled={isSubmitting}
              />
              {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                disabled={isSubmitting}
              />
              {errors.price && <p className="text-sm text-red-500">{errors.price}</p>}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <DatePicker date={selectedDate} setDate={handleDateChange} disabled={isSubmitting} />
            {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Item description"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-inventassist-orange hover:bg-inventassist-orange/90"
            >
              {isSubmitting ? "Saving..." : initialData ? "Update" : "Add"} Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

