export type CheckoutTaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type CheckoutTaskType = 'checkout' | 'checkin';
export type CheckoutItemStatus = 'pending' | 'checked' | 'checked_in' | 'cancelled';
export type AuditActionType = 'checkout' | 'checkin' | 'quantity_mismatch';

export interface CheckoutTask {
  id: string;
  event_name: string;
  status: CheckoutTaskStatus;
  type: CheckoutTaskType;
  created_by: string;
  created_at: string;
  completed_at: string | null;
  notes: string | null;
}

export interface CheckoutItem {
  id: string;
  checkout_task_id: string;
  item_id: string;
  event_item_id: string;
  original_quantity: number;
  actual_quantity: number;
  status: CheckoutItemStatus;
  reason: string | null;
  checked_by: string | null;
  checked_at: string | null;
  returned_at: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: AuditActionType;
  item_id: string;
  checkout_task_id: string;
  quantity_change: number;
  reason: string | null;
  created_at: string;
}

export interface CheckoutItemWithDetails extends CheckoutItem {
  item: {
    name: string;
    category: string;
    quantity: number;
  };
  event_item: {
    quantity: number;
    event_name: string;
  };
}

export interface CheckoutTaskWithItems extends CheckoutTask {
  checkout_items: CheckoutItemWithDetails[];
}

export interface CheckoutTaskState {
  id: string;
  items: CheckoutItemWithDetails[];
  type: CheckoutTaskType;
} 