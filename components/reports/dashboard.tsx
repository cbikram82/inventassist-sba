"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { InventoryItem } from "@/types/inventory"
import { getInventoryItems } from "@/app/actions"
import { InventorySummary } from "./inventory-summary"
import { CategoryDistribution } from "./category-distribution"
import { QuantityByCategory } from "./quantity-by-category"
import { LowStockItems } from "./low-stock-items"
import { InventoryValue } from "./inventory-value"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"

export function ReportsDashboard() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState("all")

  useEffect(() => {
    async function loadItems() {
      setIsLoading(true)
      setError(null)

      try {
        const { items, error } = await getInventoryItems()

        if (error) {
          setError(`Failed to load inventory items: ${error}`)
        } else {
          setItems(items)
        }
      } catch (err) {
        setError("Failed to connect to the database. Please check your connection.")
      } finally {
        setIsLoading(false)
      }
    }

    loadItems()
  }, [])

  // Filter items based on time range
  const filteredItems = items.filter((item) => {
    if (timeRange === "all") return true

    const itemDate = item.created_at ? new Date(item.created_at) : null
    if (!itemDate) return false

    const now = new Date()

    if (timeRange === "30days") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return itemDate >= thirtyDaysAgo
    }

    if (timeRange === "90days") {
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      return itemDate >= ninetyDaysAgo
    }

    if (timeRange === "year") {
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      return itemDate >= oneYearAgo
    }

    return true
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading reports...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Inventory Analytics</h2>
        <div className="flex items-center">
          <span className="mr-2 text-sm text-muted-foreground">Time Range:</span>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <InventorySummary items={filteredItems} />
      </div>

      <Tabs defaultValue="category" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="category">Category Analysis</TabsTrigger>
          <TabsTrigger value="stock">Stock Levels</TabsTrigger>
          <TabsTrigger value="value">Inventory Value</TabsTrigger>
        </TabsList>

        <TabsContent value="category" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
                <CardDescription>Number of items in each category</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryDistribution items={filteredItems} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quantity by Category</CardTitle>
                <CardDescription>Total quantity of items in each category</CardDescription>
              </CardHeader>
              <CardContent>
                <QuantityByCategory items={filteredItems} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stock" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Items</CardTitle>
              <CardDescription>Items with low quantity that may need restocking</CardDescription>
            </CardHeader>
            <CardContent>
              <LowStockItems items={filteredItems} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="value" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Value by Category</CardTitle>
              <CardDescription>Total value of inventory items by category</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <InventoryValue items={filteredItems} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

