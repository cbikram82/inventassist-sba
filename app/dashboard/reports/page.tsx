"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Loader2, AlertTriangle } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { cn } from "@/lib/utils"

interface Item {
  id: string
  name: string
  description: string
  quantity: number
  category: string
}

interface CategoryData {
  name: string
  value: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C43']

export default function ReportsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [lowStockItems, setLowStockItems] = useState<Item[]>([])
  const [categoryData, setCategoryData] = useState<{ category: string; quantity: number }[]>([])
  const [locationData, setLocationData] = useState<{ location: string; count: number }[]>([])

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      }
    }
    checkSession()
  }, [router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const { data, error } = await supabase
          .from('items')
          .select('*')
          .order('name')

        if (error) throw error
        setItems(data || [])
        
        // Fetch low stock items
        const { data: lowStockData, error: lowStockError } = await supabase
          .from('items')
          .select('*')
          .or('quantity.eq.0,quantity.lte.10')
          .eq('exclude_from_low_stock', false)
          .order('quantity', { ascending: true })

        if (lowStockError) throw lowStockError
        setLowStockItems(lowStockData || [])

        // Fetch items by category
        const { data: categoryData, error: categoryError } = await supabase
          .from('items')
          .select('category, quantity')
          .order('category')

        if (categoryError) throw categoryError

        // Calculate total quantity by category
        const categoryTotals = categoryData.reduce((acc: { [key: string]: number }, item) => {
          acc[item.category] = (acc[item.category] || 0) + item.quantity
          return acc
        }, {})

        setCategoryData(Object.entries(categoryTotals).map(([category, quantity]) => ({
          category,
          quantity
        })))

        // Fetch items by location
        const { data: locationData, error: locationError } = await supabase
          .from('items')
          .select('location, quantity')
          .order('location')

        if (locationError) throw locationError

        // Calculate total quantity by location
        const locationTotals = locationData.reduce((acc: { [key: string]: number }, item) => {
          acc[item.location] = (acc[item.location] || 0) + item.quantity
          return acc
        }, {})

        setLocationData(Object.entries(locationTotals).map(([location, quantity]) => ({
          location,
          count: quantity
        })))

      } catch (error) {
        console.error('Error fetching data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter low stock items
  const lowStockItemsCount = lowStockItems.length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-500">Error</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryData.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Items by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="quantity"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items by Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={locationData}
                    dataKey="count"
                    nameKey="location"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {locationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Low Stock Awareness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-semibold">Low Stock Items</h3>
                </div>
                <p className="text-2xl font-bold text-yellow-500 mt-2">{lowStockItemsCount}</p>
                <p className="text-sm text-muted-foreground mt-1">Items with quantity ≤ 10</p>
              </div>
            </div>

            {lowStockItems.length > 0 ? (
              <div className="space-y-4">
                {lowStockItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        Category: {item.category}
                      </div>
                      <div className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        item.quantity === 0 ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      )}>
                        {item.quantity} remaining
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No items are low in stock
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <style jsx global>{`
        @media (max-width: 768px) {
          .recharts-wrapper {
            width: 100% !important;
          }
          .recharts-surface {
            width: 100% !important;
          }
          .recharts-legend-wrapper {
            position: relative !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  )
} 