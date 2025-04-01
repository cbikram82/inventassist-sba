"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { InventoryItem } from "@/types/inventory"

interface InventoryValueProps {
  items: InventoryItem[]
}

export function InventoryValue({ items }: InventoryValueProps) {
  const [data, setData] = useState<Array<{ name: string; value: number }>>([])

  useEffect(() => {
    // Calculate value by category
    const categoryValue: Record<string, number> = {}

    items.forEach((item) => {
      const itemValue = item.quantity
      if (categoryValue[item.category]) {
        categoryValue[item.category] += itemValue
      } else {
        categoryValue[item.category] = itemValue
      }
    })

    // Convert to array format for Recharts
    const chartData = Object.entries(categoryValue).map(([name, value]) => ({
      name,
      value: Number.parseFloat(value.toFixed(2)),
    }))

    // Sort by value descending
    chartData.sort((a, b) => b.value - a.value)

    setData(chartData)
  }, [items])

  if (data.length === 0) {
    return <div className="flex justify-center items-center h-64 text-muted-foreground">No data available</div>
  }

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value: number) => [`£${value.toFixed(2)}`, "Value"]} />
          <Legend />
          <Bar dataKey="value" fill="#82ca9d" name="Value (£)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

