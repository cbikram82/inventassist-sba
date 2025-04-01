export interface InventoryItem {
  id: string
  name: string
  quantity: number
  category: string
  price: number
  description: string
  date: string // New field for inventory date
  created_at?: string
  updated_at?: string
}

