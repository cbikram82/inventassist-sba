"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckoutItemWithDetails } from "@/types/checkout"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { useUser } from "@/lib/useUser"
import { updateCheckoutItem } from "@/app/actions"

interface CheckinDialogProps {
  isOpen: boolean
  onClose: () => void
  items: CheckoutItemWithDetails[]
  onComplete: () => void
}

const REASON_CODES = [
  { id: "damaged", label: "Damaged" },
  { id: "lost", label: "Lost" },
  { id: "other", label: "Other" }
]

export function CheckinDialog({ isOpen, onClose, items, onComplete }: CheckinDialogProps) {
  const { toast } = useToast()
  const { user } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [reasonCodes, setReasonCodes] = useState<Record<string, string>>({})
  const [categories, setCategories] = useState<{ id: string; name: string; is_consumable: boolean }[]>([])
  const [reasonVisibility, setReasonVisibility] = useState<Record<string, boolean>>({})
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    const initialQuantities: Record<string, number> = {}
    const initialVisibility: Record<string, boolean> = {}
    
    items.forEach(item => {
      const originalQuantity = Number(item.actual_quantity)
      initialQuantities[item.id] = originalQuantity
      initialVisibility[item.id] = false
    })
    
    setReturnQuantities(initialQuantities)
    setReasonVisibility(initialVisibility)
    setReasons({})
    setReasonCodes({})
    setForceUpdateCounter(0)

    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, is_consumable')
        .order('name')

      if (error) {
        console.error('Error fetching categories:', error)
        toast({
          title: "Error",
          description: "Failed to load categories",
          variant: "destructive",
        })
        return
      }

      console.log('Fetched categories from DB:', data)
      setCategories(data || [])
    }

    if (isOpen) {
      fetchCategories()
    }
  }, [isOpen, items, toast])

  const handleQuantityChange = (itemId: string, value: number) => {
    setReturnQuantities(prev => ({
      ...prev,
      [itemId]: value
    }))
    setForceUpdateCounter(c => c + 1)
  }

  const handleReasonChange = (itemId: string, value: string) => {
    setReasons(prev => ({
      ...prev,
      [itemId]: value
    }))
  }

  const handleReasonCodeChange = (itemId: string, value: string) => {
    setReasonCodes(prev => ({
      ...prev,
      [itemId]: value
    }))
  }

  const handleCheckin = async () => {
    try {
      setLoading(true)
      const errors: { [key: string]: string } = {}

      if (!user?.id) {
        throw new Error('User ID is required for check-in')
      }

      // Validate all items
      for (const item of items) {
        const returnQuantity = returnQuantities[item.id] || 0
        const itemCategory = categories.find(c => c.name === item.item?.category)
        const isNonConsumable = !itemCategory || !itemCategory.is_consumable

        console.log('Validating item:', {
          name: item.item?.name,
          category: item.item?.category,
          isConsumable: !isNonConsumable,
          returnQuantity,
          actualQuantity: item.actual_quantity
        })

        if (isNonConsumable && returnQuantity !== item.actual_quantity) {
          if (!reasonCodes[item.id] || !reasons[item.id]) {
            errors[item.id] = "Reason code and description are required for non-consumable items when quantities don't match"
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        setErrors(errors)
        return
      }

      // Process each item
      for (const item of items) {
        const returnQuantity = returnQuantities[item.id] || 0
        const itemCategory = categories.find(c => c.name === item.item?.category)
        const isNonConsumable = !itemCategory || !itemCategory.is_consumable

        // Only send reason if it's a non-consumable item and quantities don't match
        const reason = isNonConsumable && returnQuantity !== item.actual_quantity ? {
          code: reasonCodes[item.id],
          description: reasons[item.id]
        } : undefined

        const { error: updateError } = await supabase
          .from('checkout_items')
          .update({
            actual_quantity: returnQuantity,
            status: 'checked_in',
            checked_by: user.id,
            reason: reason
          })
          .eq('id', item.id)

        if (updateError) throw updateError

        // Get current item quantity
        const { data: currentItem, error: itemError } = await supabase
          .from('items')
          .select('quantity')
          .eq('id', item.item_id)
          .single()

        if (itemError) throw itemError

        // Update item quantity
        const { error: updateQuantityError } = await supabase
          .from('items')
          .update({
            quantity: (currentItem?.quantity || 0) + returnQuantity
          })
          .eq('id', item.item_id)

        if (updateQuantityError) throw updateQuantityError

        // Create audit log
        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert({
            item_id: item.item_id,
            action: 'checkin',
            quantity: returnQuantity,
            user_id: user.id,
            checkout_task_id: item.checkout_task_id,
            checkout_item_id: item.id,
            reason: reason
          })

        if (auditError) throw auditError
      }

      toast({
        title: "Success",
        description: "Items checked in successfully",
      })
      onComplete()
    } catch (error) {
      console.error('Error checking in items:', error)
      toast({
        title: "Error",
        description: "Failed to check in items",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Check In Items</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {items.map((item) => {
            const returnQuantity = returnQuantities[item.id] || 0
            const itemCategory = categories.find(c => c.name === item.item?.category)
            const isNonConsumable = !itemCategory || !itemCategory.is_consumable
            const requiresReason = isNonConsumable && returnQuantity !== item.actual_quantity

            console.log('Item details:', {
              name: item.item?.name,
              category: item.item?.category,
              isNonConsumable,
              returnQuantity,
              actualQuantity: item.actual_quantity,
              requiresReason,
              itemCategory
            })

            return (
              <div key={item.id} className="space-y-2 p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{item.item?.name}</h4>
                    <p className="text-sm text-gray-500">
                      Category: {item.item?.category}
                      {isNonConsumable && " (Non-Consumable)"}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    Checked Out: {item.actual_quantity}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max={item.actual_quantity}
                    value={returnQuantity}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value)
                      handleQuantityChange(item.id, newValue)
                      // Log when quantity changes
                      console.log('Quantity changed:', {
                        itemId: item.id,
                        newValue,
                        actualQuantity: item.actual_quantity,
                        isNonConsumable,
                        requiresReason: isNonConsumable && newValue !== item.actual_quantity
                      })
                    }}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-500">of {item.actual_quantity}</span>
                </div>

                {requiresReason && (
                  <div className="space-y-2">
                    <select
                      value={reasonCodes[item.id] || ''}
                      onChange={(e) => setReasonCodes(prev => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Select a reason</option>
                      <option value="damaged">Damaged</option>
                      <option value="lost">Lost</option>
                      <option value="other">Other</option>
                    </select>
                    <Input
                      placeholder="Reason description"
                      value={reasons[item.id] || ''}
                      onChange={(e) => setReasons(prev => ({ ...prev, [item.id]: e.target.value }))}
                    />
                  </div>
                )}

                {errors[item.id] && (
                  <p className="text-sm text-red-500">{errors[item.id]}</p>
                )}
              </div>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCheckin} disabled={loading}>
            {loading ? "Checking In..." : "Check In"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 