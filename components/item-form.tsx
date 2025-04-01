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
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    quantity: initialData?.quantity || 0,
    description: initialData?.description || "",
    date: initialData?.date || new Date().toISOString().split("T")[0],
  })

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialData?.date ? new Date(initialData.date) : new Date(),
  )

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" ? Number.parseFloat(value) || 0 : value,
    }))

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

    if (formData.quantity < 0) {
      newErrors.quantity = "Quantity cannot be negative"
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
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                className={errors.quantity ? "border-red-500" : ""}
              />
              {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                className={errors.date ? "border-red-500" : ""}
              />
              {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
            </div>
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

