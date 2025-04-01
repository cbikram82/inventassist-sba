"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { InventoryItem } from "@/types/inventory"
import { Boxes, Package, Tags } from "lucide-react"

interface InventorySummaryProps {
  items: InventoryItem[]
}

export function InventorySummary({ items }: InventorySummaryProps) {
  // Calculate summary statistics
  const totalItems = items.length

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

  const uniqueCategories = new Set(items.map((item) => item.category)).size

  const totalValue = items.reduce((sum, item) => sum + item.quantity, 0)

  const summaryCards = [
    {
      title: "Total Items",
      value: totalItems,
      description: "Unique inventory items",
      icon: Package,
      color: "text-blue-500",
    },
    {
      title: "Total Quantity",
      value: totalQuantity,
      description: "Items in stock",
      icon: Boxes,
      color: "text-green-500",
    },
    {
      title: "Categories",
      value: uniqueCategories,
      description: "Unique categories",
      icon: Tags,
      color: "text-orange-500",
    },
  ]

  return (
    <>
      {summaryCards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </>
  )
}

