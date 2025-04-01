export interface InventoryItem {
  id: string
  name: string
  quantity: number
  category: string
  description?: string
  date: string // New field for inventory date
  location: "Safestore" | "Home"
  personName?: string // Required only when location is "Home"
  created_at?: string
  updated_at?: string
}

