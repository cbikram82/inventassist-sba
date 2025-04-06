export interface InventoryItem {
  id: string
  name: string
  quantity: number
  category: string
  description?: string
  location?: "Safestore" | "Home"
  personName?: string // Required only when location is "Home"
  created_at?: string
  updated_at?: string
}

