"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

// Initial categories
const defaultCategories = ["Cookware", "Decorations", "Consumables", "Puja Items", "Audio", "Lighting"]

interface CategorySelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function CategorySelector({ value, onChange, disabled = false, className }: CategorySelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [categories, setCategories] = React.useState<string[]>(defaultCategories)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [newCategory, setNewCategory] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredCategories = categories.filter((category) => category.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleAddCategory = () => {
    if (newCategory.trim() !== "" && !categories.includes(newCategory.trim())) {
      const updatedCategories = [...categories, newCategory.trim()]
      setCategories(updatedCategories)
      onChange(newCategory.trim())
      setNewCategory("")
      setDialogOpen(false)
      setOpen(false)
    }
  }

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", className)}
            disabled={disabled}
            onClick={() => setOpen(true)}
          >
            {value ? value : "Select category..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <div className="p-2">
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-2"
            />
            <ScrollArea className="h-[200px]">
              <div className="p-1">
                {filteredCategories.length === 0 ? (
                  <div className="py-6 text-center text-sm">No categories found.</div>
                ) : (
                  filteredCategories.map((category) => (
                    <div
                      key={category}
                      className={cn(
                        "flex cursor-pointer items-center rounded-md px-2 py-2 text-sm",
                        value === category ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                      )}
                      onClick={() => {
                        onChange(category)
                        setOpen(false)
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", value === category ? "opacity-100" : "opacity-0")} />
                      {category}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="mt-2 border-t pt-2">
              <Button variant="ghost" className="w-full justify-start" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add new category
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>Create a new category for inventory items.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-category">Category Name</Label>
              <Input
                id="new-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter new category name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewCategory("")
                setDialogOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCategory}
              className="bg-inventassist-orange hover:bg-inventassist-orange/90"
              disabled={!newCategory.trim()}
            >
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

