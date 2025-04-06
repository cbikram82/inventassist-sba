"use server"

import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/supabase"
import type { InventoryItem } from "@/types/inventory"
import type { CheckoutTask, CheckoutItemWithDetails } from "@/types/checkout"

export async function getInventoryItems() {
  try {
    const { data, error } = await supabase.from("inventory_items").select("*").order("name")

    if (error) {
      console.error("Error fetching inventory items:", error)
      return { items: [], error: error.message }
    }

    return { items: data as InventoryItem[], error: null }
  } catch (error) {
    console.error("Unexpected error:", error)
    return { items: [], error: "An unexpected error occurred" }
  }
}

export async function addInventoryItem(item: Omit<InventoryItem, "id">) {
  try {
    // First, check if the category exists
    const { data: existingCategory, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("name", item.category)
      .single()

    if (categoryError && categoryError.code !== "PGRST116") { // PGRST116 is "no rows returned"
      console.error("Error checking category:", categoryError)
      return { success: false, error: categoryError.message }
    }

    // If category doesn't exist, create it
    if (!existingCategory) {
      const { error: createCategoryError } = await supabase
        .from("categories")
        .insert([{ name: item.category }])

      if (createCategoryError) {
        console.error("Error creating category:", createCategoryError)
        return { success: false, error: createCategoryError.message }
      }
    }

    // Now insert the item
    const { data, error } = await supabase.from("items").insert([item]).select().single()

    if (error) {
      console.error("Error adding inventory item:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/")
    return { success: true, item: data as InventoryItem, error: null }
  } catch (error) {
    console.error("Unexpected error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function updateInventoryItem(item: InventoryItem) {
  try {
    const { data, error } = await supabase
      .from("items")
      .update({
        name: item.name,
        quantity: item.quantity,
        category: item.category,
        description: item.description,
        location: item.location,
        personName: item.personName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating inventory item:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/")
    return { success: true, item: data as InventoryItem, error: null }
  } catch (error) {
    console.error("Unexpected error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function deleteInventoryItem(id: string) {
  try {
    const { error } = await supabase.from("inventory_items").delete().eq("id", id)

    if (error) {
      console.error("Error deleting inventory item:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/")
    return { success: true, error: null }
  } catch (error) {
    console.error("Unexpected error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Checkout Actions
export async function createCheckoutTask(eventName: string, type: 'checkout' | 'checkin', userId: string): Promise<CheckoutTask> {
  const { data, error } = await supabase
    .from('checkout_tasks')
    .insert({
      event_name: eventName,
      type,
      created_by: userId,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data as CheckoutTask;
}

interface CheckoutTaskWithItems extends CheckoutTask {
  checkout_items: CheckoutItemWithDetails[];
}

export async function getCheckoutTask(taskId: string): Promise<CheckoutTaskWithItems> {
  const { data, error } = await supabase
    .from('checkout_tasks')
    .select(`
      *,
      checkout_items (
        *,
        item:items (
          name,
          category,
          quantity
        ),
        event_item:event_items (
          quantity
        )
      )
    `)
    .eq('id', taskId)
    .single();

  if (error) throw error;
  return data as CheckoutTaskWithItems;
}

export async function updateCheckoutItem(
  itemId: string,
  actualQuantity: number,
  status: 'checked' | 'returned',
  userId: string,
  reason?: string
) {
  // Get the item details including category
  const { data: itemData, error: itemError } = await supabase
    .from('items')
    .select('category')
    .eq('id', itemId)
    .single();

  if (itemError) throw itemError;

  // For non-consumable items during check-in, require a reason if quantities don't match
  const isNonConsumable = ['Equipment', 'Furniture', 'Electronics'].includes(itemData.category);
  const isCheckin = status === 'returned';

  if (isNonConsumable && isCheckin && !reason) {
    throw new Error('Reason is required for non-consumable items with quantity mismatch');
  }

  const { data, error } = await supabase
    .from('checkout_items')
    .update({
      actual_quantity: actualQuantity,
      status,
      checked_by: userId,
      checked_at: new Date().toISOString(),
      reason
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeCheckoutTask(taskId: string) {
  const { data, error } = await supabase
    .from('checkout_tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createAuditLog(
  userId: string,
  action: 'checkout' | 'checkin' | 'quantity_mismatch',
  itemId: string,
  checkoutTaskId: string,
  quantityChange: number,
  reason?: string
) {
  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: userId,
      action,
      item_id: itemId,
      checkout_task_id: checkoutTaskId,
      quantity_change: quantityChange,
      reason
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAuditLogs(startDate?: string, endDate?: string) {
  let query = supabase
    .from('audit_logs')
    .select(`
      *,
      user:users (
        name
      ),
      item:items (
        name,
        category
      ),
      checkout_task:checkout_tasks (
        event:events (
          name
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

