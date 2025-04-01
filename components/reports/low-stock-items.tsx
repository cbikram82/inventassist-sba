"use client"

import { useState, useEffect } from "react"
import type { InventoryItem } from "@/types/inventory"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface LowStockItemsProps {
  items: InventoryItem[]
}

export function LowStockItems({ items }: LowStockItemsProps) {
  const [threshold, setThreshold] = useState("10")
  const [sortBy, setSortBy] = useState("quantity-asc")
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])

  useEffect(() => {
    // Filter items below threshold
    const thresholdValue = Number.parseInt(threshold, 10)
    let filtered = items.filter((item) => item.quantity <= thresholdValue)

    // Sort items
    if (sortBy === "quantity-asc") {
      filtered = filtered.sort((a, b) => a.quantity - b.quantity)
    } else if (sortBy === "quantity-desc") {
      filtered = filtered.sort((a, b) => b.quantity - a.quantity)
    } else if (sortBy === "name-asc") {
      filtered = filtered.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === "name-desc") {
      filtered = filtered.sort((a, b) => b.name.localeCompare(a.name))
    }

    setFilteredItems(filtered)
  }, [items, threshold, sortBy])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">Threshold:</span>
          <Input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="w-20"
            min="1"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm">Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quantity-asc">Quantity (Low to High)</SelectItem>
              <SelectItem value="quantity-desc">Quantity (High to Low)</SelectItem>
              <SelectItem value="name-asc">Name (A to Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z to A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                  No low stock items found
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell className="text-right">
                    <span className={item.quantity <= 5 ? "text-red-500 font-bold" : ""}>{item.quantity}</span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

