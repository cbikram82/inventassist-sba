export interface InventoryItem {
  id: string
  name: string
  description: string
  quantity: number
  category: string
  location: string
  person_name?: string
  exclude_from_low_stock: boolean
  created_at: string
  updated_at: string
} 