"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import ThresholdSettings from "./threshold-settings"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"

interface InventoryStats {
  total_items: number
  low_stock_items: number
  out_of_stock_items: number
  category_distribution: Array<{
    name: string
    value: number
  }>
  stock_levels: Array<{
    name: string
    quantity: number
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function ReportsPage() {
  const [stats, setStats] = useState<InventoryStats>({
    total_items: 0,
    low_stock_items: 0,
    out_of_stock_items: 0,
    category_distribution: [],
    stock_levels: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's threshold setting
      const { data: settings } = await supabase
        .from('user_settings')
        .select('low_stock_threshold')
        .eq('user_id', user.id)
        .single()

      const threshold = settings?.low_stock_threshold || 10

      // Get all items
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')

      if (itemsError) throw itemsError

      // Calculate statistics
      const totalItems = items.length
      const lowStockItems = items.filter(item => item.quantity > 0 && item.quantity <= threshold).length
      const outOfStockItems = items.filter(item => item.quantity === 0).length

      // Calculate category distribution
      const categoryCounts = items.reduce((acc: { [key: string]: number }, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1
        return acc
      }, {})

      const categoryDistribution = Object.entries(categoryCounts).map(([name, value]) => ({
        name,
        value
      }))

      // Get top 10 items by quantity
      const stockLevels = items
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)
        .map(item => ({
          name: item.name,
          quantity: item.quantity
        }))

      setStats({
        total_items: totalItems,
        low_stock_items: lowStockItems,
        out_of_stock_items: outOfStockItems,
        category_distribution: categoryDistribution,
        stock_levels: stockLevels
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      setError('Failed to load statistics')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
        <p className="text-muted-foreground">
          View inventory statistics and analytics
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_items}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.low_stock_items}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.out_of_stock_items}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.category_distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.category_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Top 10 Items by Stock Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.stock_levels}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <ThresholdSettings />
    </div>
  )
} 