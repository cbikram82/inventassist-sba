"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, BarChart3, Boxes, Loader2, Plus } from "lucide-react"
import type { InventoryItem } from "@/types/inventory"
import { getInventoryItems } from "@/app/actions"
import { InventorySummary } from "./reports/inventory-summary"
import { LowStockItems } from "./reports/low-stock-items"

export function DashboardOverview() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
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

  // Get low stock items (quantity <= 10)
  const lowStockItems = items.filter((item) => item.quantity <= 10)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <InventorySummary items={items} />
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Items</CardTitle>
            <CardDescription>Items with quantity of 10 or less that may need restocking</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No low stock items found</div>
            ) : (
              <div className="h-[250px] sm:h-[300px] overflow-auto">
                <LowStockItems items={items} />
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Link href="/inventory" className="w-full">
              <Button variant="outline" className="w-full">
                <Boxes className="mr-2 h-4 w-4" />
                Manage Inventory
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/inventory" className="w-full">
              <Button className="w-full bg-sba-red hover:bg-sba-red/90">
                <Plus className="mr-2 h-4 w-4" />
                Add New Item
              </Button>
            </Link>

            <Link href="/reports" className="w-full">
              <Button variant="outline" className="w-full">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Reports
              </Button>
            </Link>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

