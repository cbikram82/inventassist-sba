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
  try {
    console.log('Creating checkout task with:', { eventName, type, userId });

    // First, get the event ID from the event name
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('name', eventName)
      .single();

    if (eventError) {
      console.error('Error fetching event:', eventError);
      throw new Error(`Failed to fetch event: ${eventError.message}`);
    }

    if (!event) {
      throw new Error(`Event not found: ${eventName}`);
    }

    // Create the checkout task with event_id
    const { data: task, error: taskError } = await supabase
      .from('checkout_tasks')
      .insert({
        event_id: event.id,
        type,
        created_by: userId,
        status: 'pending'
      })
      .select('*')
      .single();

    if (taskError) {
      console.error('Error creating checkout task:', taskError);
      throw new Error(`Failed to create checkout task: ${taskError.message}`);
    }

    if (!task) {
      throw new Error('No task data returned after creation');
    }

    console.log('Created checkout task:', task);

    // Get event items for this event
    const { data: eventItems, error: eventItemsError } = await supabase
      .from('event_items')
      .select('*')
      .eq('event_name', eventName);

    if (eventItemsError) {
      console.error('Error fetching event items:', eventItemsError);
      throw new Error(`Failed to fetch event items: ${eventItemsError.message}`);
    }

    console.log('Found event items:', eventItems);

    if (eventItems && eventItems.length > 0) {
      // Create checkout items for each event item
      const checkoutItems = eventItems.map(eventItem => ({
        checkout_task_id: task.id,
        item_id: eventItem.item_id,
        event_item_id: eventItem.id,
        original_quantity: eventItem.quantity,
        actual_quantity: eventItem.quantity,
        status: 'pending'
      }));

      console.log('Creating checkout items:', checkoutItems);

      const { error: checkoutItemsError } = await supabase
        .from('checkout_items')
        .insert(checkoutItems);

      if (checkoutItemsError) {
        console.error('Error creating checkout items:', checkoutItemsError);
        throw new Error(`Failed to create checkout items: ${checkoutItemsError.message}`);
      }
    }

    return task as CheckoutTask;
  } catch (error) {
    console.error('Error in createCheckoutTask:', error);
    throw error;
  }
}

interface CheckoutTaskWithItems extends CheckoutTask {
  checkout_items: CheckoutItemWithDetails[];
}

export async function getCheckoutTask(taskId: string): Promise<CheckoutTaskWithItems> {
  // First get the task with event information
  const { data: task, error: taskError } = await supabase
    .from('checkout_tasks')
    .select(`
      *,
      event:events (
        name
      )
    `)
    .eq('id', taskId)
    .single();

  if (taskError) throw taskError;

  // Then get the checkout items with their related data
  const { data: checkoutItems, error: itemsError } = await supabase
    .from('checkout_items')
    .select(`
      *,
      item:items (
        name,
        category,
        quantity
      ),
      event_item:event_items (
        quantity
      )
    `)
    .eq('checkout_task_id', taskId);

  if (itemsError) throw itemsError;

  return {
    ...task,
    checkout_items: checkoutItems || []
  } as CheckoutTaskWithItems;
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

