import type { InventoryItem } from "@/types/inventory"

export interface ImportResult {
  success: boolean
  items: Omit<InventoryItem, "id">[]
  errors: string[]
  totalRows: number
}

export async function parseCSVFile(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    const result: ImportResult = {
      success: false,
      items: [],
      errors: [],
      totalRows: 0,
    }

    reader.onload = (event) => {
      try {
        const csvData = event.target?.result as string
        const lines = csvData.split("\n")

        // Skip empty lines
        const nonEmptyLines = lines.filter((line) => line.trim() !== "")
        result.totalRows = nonEmptyLines.length - 1 // Exclude header row

        if (nonEmptyLines.length <= 1) {
          result.errors.push("The CSV file is empty or contains only headers.")
          resolve(result)
          return
        }

        // Parse header row
        const headers = parseCSVRow(nonEmptyLines[0])
        const requiredColumns = ["name", "category", "quantity"]
        const headerMap: Record<string, number> = {}

        // Check if all required columns exist (case insensitive)
        const lowerCaseHeaders = headers.map((h) => h.toLowerCase())
        for (const column of requiredColumns) {
          const index = lowerCaseHeaders.indexOf(column)
          if (index === -1) {
            result.errors.push(`Required column '${column}' is missing from the CSV file.`)
          } else {
            headerMap[column] = index
          }
        }

        // Map optional columns - only keeping description
        const optionalColumns = ["description"]
        for (const column of optionalColumns) {
          const index = lowerCaseHeaders.indexOf(column)
          if (index !== -1) {
            headerMap[column] = index
          }
        }

        if (result.errors.length > 0) {
          resolve(result)
          return
        }

        // Parse data rows
        for (let i = 1; i < nonEmptyLines.length; i++) {
          try {
            const rowData = parseCSVRow(nonEmptyLines[i])
            if (rowData.length < Object.keys(headerMap).length) {
              result.errors.push(`Row ${i} has fewer columns than expected.`)
              continue
            }

            const name = rowData[headerMap["name"]].trim()
            const category = rowData[headerMap["category"]].trim()
            const quantityStr = rowData[headerMap["quantity"]].trim()

            // Validate required fields
            if (!name) {
              result.errors.push(`Row ${i}: Name is required.`)
              continue
            }

            if (!category) {
              result.errors.push(`Row ${i}: Category is required.`)
              continue
            }

            const quantity = Number.parseInt(quantityStr, 10)
            if (isNaN(quantity) || quantity < 0) {
              result.errors.push(`Row ${i}: Quantity must be a non-negative number.`)
              continue
            }

            let description = ""
            if ("description" in headerMap && rowData[headerMap["description"]]) {
              description = rowData[headerMap["description"]].trim()
            }

            // Add valid item
            result.items.push({
              name,
              category,
              quantity,
              description,
              location: "Safestore"
            })
          } catch (err) {
            result.errors.push(`Error parsing row ${i}: ${err}`)
          }
        }

        result.success = result.items.length > 0
        resolve(result)
      } catch (err) {
        result.errors.push(`Failed to parse CSV file: ${err}`)
        resolve(result)
      }
    }

    reader.onerror = () => {
      result.errors.push("Error reading the file.")
      resolve(result)
    }

    reader.readAsText(file)
  })
}

// Helper function to parse CSV row, handling quoted values with commas
function parseCSVRow(row: string): string[] {
  const result: string[] = []
  let insideQuotes = false
  let currentValue = ""

  for (let i = 0; i < row.length; i++) {
    const char = row[i]

    if (char === '"') {
      // Handle escaped quotes (two double quotes in a row)
      if (i + 1 < row.length && row[i + 1] === '"') {
        currentValue += '"'
        i++ // Skip the next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes
      }
    } else if (char === "," && !insideQuotes) {
      // End of field
      result.push(currentValue)
      currentValue = ""
    } else {
      currentValue += char
    }
  }

  // Add the last field
  result.push(currentValue)

  return result
}

// Generate a template CSV string for downloading
export function generateTemplateCSV(): string {
  const headers = ["Name", "Category", "Quantity", "Description"]
  const sampleData = [
    ["Dinner Plate", "Cookware", "50", "White ceramic dinner plates"],
    ["LED String Lights", "Lighting", "10", "Decorative string lights for events"],
    ["Rice (10kg bag)", "Consumables", "20", "Basmati rice in bulk packaging"],
  ]

  const csvContent = [headers.join(","), ...sampleData.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

  return csvContent
}

