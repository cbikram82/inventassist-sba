export interface EventItem {
  id: string
  event_name: string
  item_id: string
  item_name: string
  quantity: number
  created_at: string
  updated_at: string
  remaining_quantity: number
  is_checked_out: boolean
  last_checked_by?: string
  last_checked_at?: string
  checkout_items?: {
    id: string
    status: string
    checked_by: string
    checked_at: string
    user?: {
      name: string
    }
  }[]
} 