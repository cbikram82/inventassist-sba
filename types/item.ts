export interface Item {
  id: string
  name: string
  category: string
  quantity: number
  description?: string
  created_at: string
  updated_at: string
  item?: {
    name: string
    category: string
  }
  original_quantity: number
  actual_quantity: number
} 