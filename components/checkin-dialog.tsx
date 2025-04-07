"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckoutItemWithDetails } from "@/types/checkout"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { useUser } from "@/lib/useUser"

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

  const handleQuantityChange = (itemId: string, value: string) => {
    setReturnQuantities(prev => ({
      ...prev,
      [itemId]: parseInt(value) || 0
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
    try {
      setIsSubmitting(true)

      // Validate quantities and reasons
      for (const item of items) {
        const returnQuantity = returnQuantities[item.id] || 0
        const isConsumable = item.item?.category === "Consumables" || item.item?.category === "Puja Consumables"

        if (!isConsumable && returnQuantity < item.actual_quantity) {
          if (!reasonCodes[item.id] || !reasons[item.id]) {
            throw new Error(`Please provide a reason code and description for ${item.item?.name}`)
          }
        }
      }

      // Update items and create audit logs
      for (const item of items) {
        const returnQuantity = returnQuantities[item.id] || 0
        const isConsumable = item.item?.category === "Consumables" || item.item?.category === "Puja Consumables"

        // Update checkout item status
        const { error: statusError } = await supabase
          .from('checkout_items')
          .update({ 
            status: 'checked_in',
            actual_quantity: returnQuantity,
            reason: !isConsumable && returnQuantity < item.actual_quantity ? 
              `${reasonCodes[item.id]}: ${reasons[item.id]}` : null,
            checked_by: user?.id,
            checked_at: new Date().toISOString()
          })
          .eq('id', item.id)

        if (statusError) throw statusError

        // Get current item quantity
        const { data: currentItem, error: fetchError } = await supabase
          .from('items')
          .select('quantity')
          .eq('id', item.item_id)
          .single()

        if (fetchError) throw fetchError

        // Update item quantity (add back the returned quantity)
        const { error: updateError } = await supabase
          .from('items')
          .update({ quantity: (currentItem?.quantity || 0) + returnQuantity })
          .eq('id', item.item_id)

        if (updateError) throw updateError

        // Create audit log
        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert([{
            item_id: item.item_id,
            action: 'checkin',
            quantity_change: returnQuantity,
            reason: !isConsumable && returnQuantity < item.actual_quantity ? 
              `${reasonCodes[item.id]}: ${reasons[item.id]}` : null,
            checkout_task_id: item.checkout_task_id,
            user_id: user?.id
          }])

        if (auditError) throw auditError
      }

      toast({
        title: "Success",
        description: "Items checked in successfully",
      })

      onComplete()
      onClose()
    } catch (error) {
      console.error('Error checking in items:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check in items",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Check In Items</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {items.map((item) => {
            const isConsumable = item.item?.category === "Consumables" || item.item?.category === "Puja Consumables"
            const returnQuantity = returnQuantities[item.id] || 0
            const requiresReason = !isConsumable && returnQuantity < item.actual_quantity

            return (
              <div key={item.id} className="space-y-2 p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{item.item?.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Checked out: {item.actual_quantity}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Category: {item.item?.category}
                    </p>
                    {!isConsumable && (
                      <p className="text-sm text-yellow-600">
                        Note: You must return the exact quantity checked out unless items are damaged or lost
                      </p>
                    )}
                  </div>
                  <div className="w-32">
                    <Label>Return Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      max={isConsumable ? undefined : item.actual_quantity}
                      value={returnQuantities[item.id] || ""}
                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                    />
                  </div>
                </div>

                {requiresReason && (
                  <div className="space-y-2">
                    <div>
                      <Label>Reason Code</Label>
                      <Select
                        value={reasonCodes[item.id]}
                        onValueChange={(value) => handleReasonCodeChange(item.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {REASON_CODES.map(code => (
                            <SelectItem key={code.id} value={code.id}>
                              {code.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Reason Description</Label>
                      <Textarea
                        value={reasons[item.id] || ""}
                        onChange={(e) => handleReasonChange(item.id, e.target.value)}
                        placeholder="Please provide details about why the quantity is less"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCheckin} disabled={isSubmitting}>
              {isSubmitting ? "Checking In..." : "Check In"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 