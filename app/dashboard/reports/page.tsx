"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { Package, Users, AlertTriangle } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AnalyticsData {
  totalItems: number
  totalUsers: number
  lowStockItems: number
  categoryDistribution: { category: string; count: number }[]
  recentActivity: { date: string; action: string; item: string }[]
}

export default function ReportsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState("7d")

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      // Fetch total items
      const { count: totalItems, error: itemsError } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })

      if (itemsError) throw itemsError

      // Fetch total users
      const { count: totalUsers, error: usersError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })

      if (usersError) throw usersError

      // Fetch low stock items (quantity < 10)
      const { count: lowStockItems, error: lowStockError } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .lt("quantity", 10)

      if (lowStockError) throw lowStockError

      // Fetch category distribution
      const { data: categoryData, error: categoryError } = await supabase
        .from("items")
        .select("category")
        .order("category")

      if (categoryError) throw categoryError

      const categoryCounts = categoryData.reduce((acc: { [key: string]: number }, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1
        return acc
      }, {})

      const categoryDistribution = Object.entries(categoryCounts).map(([category, count]) => ({
        category,
        count
      }))

      // Fetch recent activity (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const { data: recentActivity, error: activityError } = await supabase
        .from("items")
        .select("name, created_at")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(5)

      if (activityError) throw activityError

      const formattedActivity = recentActivity.map(item => ({
        date: new Date(item.created_at).toLocaleDateString(),
        action: "Added",
        item: item.name
      }))

      setData({
        totalItems: totalItems || 0,
        totalUsers: totalUsers || 0,
        lowStockItems: lowStockItems || 0,
        categoryDistribution,
        recentActivity: formattedActivity
      })
    } catch (error) {
      console.error("Error fetching analytics:", error)
      setError("Failed to load analytics data")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-muted-foreground">
            View your inventory statistics and insights
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.lowStockItems}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
            <CardDescription>Items by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.categoryDistribution.map((category) => (
                <div key={category.category} className="flex items-center">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{category.category}</div>
                    <div className="text-sm text-muted-foreground">
                      {category.count} items
                    </div>
                  </div>
                  <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${(category.count / (data?.totalItems || 1)) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest changes in your inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{activity.item}</div>
                    <div className="text-sm text-muted-foreground">
                      {activity.action} on {activity.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 