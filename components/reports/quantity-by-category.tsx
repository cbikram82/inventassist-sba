"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { InventoryItem } from "@/types/inventory"

interface QuantityByCategoryProps {
  items: InventoryItem[]
}

export function QuantityByCategory({ items }: QuantityByCategoryProps) {
  const [data, setData] = useState<Array<{ name: string; quantity: number }>>([])

  useEffect(() => {
    // Sum quantity by category
    const categoryQuantity: Record<string, number> = {}

    items.forEach((item) => {
      if (categoryQuantity[item.category]) {
        categoryQuantity[item.category] += item.quantity
      } else {
        categoryQuantity[item.category] = item.quantity
      }
    })

    // Convert to array format for Recharts
    const chartData = Object.entries(categoryQuantity).map(([name, quantity]) => ({
      name,
      quantity,
    }))

    // Sort by quantity descending
    chartData.sort((a, b) => b.quantity - a.quantity)

    setData(chartData)
  }, [items])

  if (data.length === 0) {
    return <div className="flex justify-center items-center h-64 text-muted-foreground">No data available</div>
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value: number) => [`${value}`, "Quantity"]} />
          <Bar dataKey="quantity" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

