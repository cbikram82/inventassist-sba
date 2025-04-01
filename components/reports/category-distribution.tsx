"use client"

import { useState, useEffect } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import type { InventoryItem } from "@/types/inventory"

interface CategoryDistributionProps {
  items: InventoryItem[]
}

export function CategoryDistribution({ items }: CategoryDistributionProps) {
  const [data, setData] = useState<Array<{ name: string; value: number }>>([])

  useEffect(() => {
    // Count items by category
    const categoryCount: Record<string, number> = {}

    items.forEach((item) => {
      if (categoryCount[item.category]) {
        categoryCount[item.category]++
      } else {
        categoryCount[item.category] = 1
      }
    })

    // Convert to array format for Recharts
    const chartData = Object.entries(categoryCount).map(([name, value]) => ({
      name,
      value,
    }))

    // Sort by value descending
    chartData.sort((a, b) => b.value - a.value)

    setData(chartData)
  }, [items])

  // Custom colors for the pie chart
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"]

  if (data.length === 0) {
    return <div className="flex justify-center items-center h-64 text-muted-foreground">No data available</div>
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`${value} items`, "Count"]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

