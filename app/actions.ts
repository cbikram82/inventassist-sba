"use server"

import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/supabase"
import type { InventoryItem } from "@/types/inventory"

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
    const { data, error } = await supabase.from("inventory_items").insert([item]).select().single()

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
      .from("inventory_items")
      .update({
        name: item.name,
        quantity: item.quantity,
        category: item.category,
        description: item.description,
        date: item.date,
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

