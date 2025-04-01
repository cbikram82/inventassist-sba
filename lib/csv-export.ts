import type { InventoryItem } from "@/types/inventory"
import { format } from "date-fns"

export function exportToCSV(items: InventoryItem[], filename = "inventory-export.csv") {
  // Define the CSV headers - removing price
  const headers = ["Name", "Category", "Quantity", "Date", "Description"]

  // Convert items to CSV rows - excluding price
  const rows = items.map((item) => [
    // Wrap values in quotes to handle commas in text
    `"${item.name.replace(/"/g, '""')}"`,
    `"${item.category.replace(/"/g, '""')}"`,
    item.quantity.toString(),
    `"${item.date ? format(new Date(item.date), "yyyy-MM-dd") : ""}"`,
    `"${(item.description || "").replace(/"/g, '""')}"`,
  ])

  // Combine headers and rows
  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

  // Create a Blob with the CSV content
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })

  // Create a download link
  const link = document.createElement("a")

  // Create a URL for the blob
  const url = URL.createObjectURL(blob)

  // Set link properties
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"

  // Add link to the document
  document.body.appendChild(link)

  // Click the link to trigger the download
  link.click()

  // Clean up
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

