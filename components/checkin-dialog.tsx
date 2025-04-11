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
import { User } from "@/types/user"

interface CheckinDialogProps {
  isOpen: boolean
  onClose: () => void
  items: CheckoutItemWithDetails[]
  onComplete: () => void
  taskId: string
}

const REASON_CODES = [
  { id: "damaged", label: "Damaged" },
  { id: "lost", label: "Lost" },
  { id: "other", label: "Other" }
]

export function CheckinDialog({
  isOpen,
  onClose,
  items: initialItems = [],
  onComplete,
  taskId
}: CheckinDialogProps) {
  const { toast } = useToast()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItemsMap, setSelectedItemsMap] = useState<Record<string, boolean>>({})
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({})
  const [reasonCodes, setReasonCodes] = useState<Record<string, string>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [categories, setCategories] = useState<{ id: string; name: string; is_consumable: boolean }[]>([])
  const [items, setItems] = useState<CheckoutItemWithDetails[]>(initialItems)
  const [reasonVisibility, setReasonVisibility] = useState<Record<string, boolean>>({})

  useEffect(() => {
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
      // Initialize return quantities with actual quantities
      const initialQuantities: Record<string, number> = {}
      const initialVisibility: Record<string, boolean> = {}
      items.forEach(item => {
        initialQuantities[item.id] = item.actual_quantity
        initialVisibility[item.id] = false
      })
      setReturnQuantities(initialQuantities)
      setReasonVisibility(initialVisibility)
    }
  }, [isOpen, items, toast])

  const handleQuantityChange = (itemId: string, value: number) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const itemCategory = categories.find(c => c.name === item.item?.category)
    const isNonConsumable = !itemCategory || !itemCategory.is_consumable
    const hasQuantityMismatch = value !== item.actual_quantity

    console.log('Quantity changed:', {
      itemId,
      value,
      actualQuantity: item.actual_quantity,
      category: item.item?.category,
      isNonConsumable,
      hasQuantityMismatch,
      showReason: isNonConsumable && hasQuantityMismatch,
      itemCategory
    })

    setReturnQuantities(prev => ({
      ...prev,
      [itemId]: value
    }))

    setReasonVisibility(prev => ({
      ...prev,
      [itemId]: isNonConsumable && hasQuantityMismatch
    }))
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
    console.log('Starting checkin process...');
    console.log('Selected items:', items.filter(item => selectedItemsMap[item.id]));
    console.log('Quantities:', returnQuantities);
    console.log('Reasons:', reasons);

    if (!user) {
      console.error('No user found');
      setError('User not authenticated');
      return;
    }

    if (!taskId) {
      console.error('No task ID provided');
      setError('No task ID provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validate that at least one item is selected
      const selectedItems = items.filter(item => selectedItemsMap[item.id]);
      if (selectedItems.length === 0) {
        console.error('No items selected');
        setError('Please select at least one item to check in');
        return;
      }

      // Process each item
      for (const item of selectedItems) {
        const checkinQuantity = returnQuantities[item.id] || item.actual_quantity;
        const reason = reasons[item.id] || '';

        // Get current item quantity
        const { data: currentItem, error: itemError } = await supabase
          .from('items')
          .select('quantity')
          .eq('id', item.item_id)
          .single();

        if (itemError) throw itemError;

        // Update item quantity
        const { error: updateQuantityError } = await supabase
          .from('items')
          .update({
            quantity: (currentItem?.quantity || 0) + checkinQuantity
          })
          .eq('id', item.item_id);

        if (updateQuantityError) throw updateQuantityError;

        // Update checkout item status
        const { error: updateCheckoutItemError } = await supabase
          .from('checkout_items')
          .update({
            status: 'checked_in',
            returned_at: new Date().toISOString(),
            reason: reason
          })
          .eq('id', item.id);

        if (updateCheckoutItemError) throw updateCheckoutItemError;

        // Create audit log
        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert({
            user_id: user.id,
            action: 'checkin',
            item_id: item.item_id,
            checkout_task_id: taskId,
            quantity_change: checkinQuantity,
            reason: reason
          });

        if (auditError) throw auditError;
      }

      // Update task status to completed
      const { error: updateTaskError } = await supabase
        .from('checkout_tasks')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (updateTaskError) throw updateTaskError;

      toast({
        title: 'Success',
        description: 'Items checked in successfully'
      });

      onComplete();
      onClose();
    } catch (error) {
      console.error('Error checking in items:', error);
      setError('Failed to process checkin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Check In Items</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="space-y-2 p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedItemsMap[item.id] || false}
                  onChange={(e) => {
                    setSelectedItemsMap(prev => ({
                      ...prev,
                      [item.id]: e.target.checked
                    }))
                  }}
                  className="h-4 w-4"
                />
                <div className="flex-1">
                  <h4 className="font-medium">{item.item?.name}</h4>
                  <p className="text-sm text-gray-500">
                    Category: {item.item?.category}
                    {!categories.find(c => c.name === item.item?.category)?.is_consumable && " (Non-Consumable)"}
                  </p>
                </div>
              </div>
              
              {selectedItemsMap[item.id] && (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max={item.actual_quantity}
                      value={returnQuantities[item.id] || 0}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value)
                        handleQuantityChange(item.id, newValue)
                      }}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-500">of {item.actual_quantity}</span>
                  </div>

                  {reasonVisibility[item.id] && (
                    <div className="space-y-2 mt-2">
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
                </>
              )}
            </div>
          ))}
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