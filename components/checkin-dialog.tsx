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
      setIsSubmitting(true);

      // Validate all items before proceeding
      for (const item of items) {
        const returnQuantity = returnQuantities[item.id] || 0;
        const isConsumable = item.item?.category === "Consumables" || item.item?.category === "Puja Consumables";
        const isNonConsumable = !isConsumable;

        // Basic validation
        if (returnQuantity <= 0) {
          toast({
            title: "Validation Error",
            description: `Please enter a valid return quantity for ${item.item?.name}`,
            variant: "destructive",
          });
          return;
        }

        if (returnQuantity > item.actual_quantity) {
          toast({
            title: "Validation Error",
            description: `Return quantity cannot exceed checked out quantity (${item.actual_quantity}) for ${item.item?.name}`,
            variant: "destructive",
          });
          return;
        }

        // Non-consumable specific validation
        if (isNonConsumable) {
          if (returnQuantity < item.actual_quantity) {
            if (!reasonCodes[item.id] || !reasons[item.id]) {
              toast({
                title: "Validation Error",
                description: `For ${item.item?.name}, you must return the exact quantity (${item.actual_quantity}) or provide both a reason code and description.`,
                variant: "destructive",
              });
              return;
            }
          }
        }
      }

      // Proceed with check-in for each item
      for (const item of items) {
        const returnQuantity = returnQuantities[item.id] || 0;
        const isConsumable = item.item?.category === "Consumables" || item.item?.category === "Puja Consumables";
        const isNonConsumable = !isConsumable;
        const reason = isNonConsumable && returnQuantity < item.actual_quantity ? 
          `${reasonCodes[item.id]}: ${reasons[item.id]}` : null;

        // Get current item quantity
        const { data: currentItem, error: fetchError } = await supabase
          .from('items')
          .select('quantity')
          .eq('id', item.item_id)
          .single();

        if (fetchError) {
          throw new Error(`Error fetching current item quantity: ${fetchError.message}`);
        }

        // Calculate new quantity (add back the returned quantity)
        const newQuantity = (currentItem?.quantity || 0) + returnQuantity;

        // Update item quantity
        const { error: updateError } = await supabase
          .from('items')
          .update({ quantity: newQuantity })
          .eq('id', item.item_id);

        if (updateError) {
          throw new Error(`Error updating item quantity: ${updateError.message}`);
        }

        // Update checkout item status
        const { error: checkoutError } = await supabase
          .from('checkout_items')
          .update({
            status: 'checked_in',
            actual_quantity: returnQuantity,
            reason: reason,
            checked_by: user?.id,
            checked_at: new Date().toISOString()
          })
          .eq('id', item.id);

        if (checkoutError) {
          throw new Error(`Error updating checkout item: ${checkoutError.message}`);
        }

        // Create audit log
        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert([{
            user_id: user?.id,
            action: 'checkin',
            item_id: item.item_id,
            checkout_task_id: item.checkout_task_id,
            quantity_change: returnQuantity,
            reason: reason
          }]);

        if (auditError) {
          throw new Error(`Error creating audit log: ${auditError.message}`);
        }
      }

      // Close dialog and refresh data
      onComplete();
      onClose();
    } catch (error) {
      console.error('Error during check-in:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check in items",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Check In Items</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {items.map((item) => {
            const isConsumable = item.item?.category === "Consumables" || item.item?.category === "Puja Consumables";
            const isNonConsumable = !isConsumable;
            const returnQuantity = returnQuantities[item.id] || 0;
            const requiresReason = isNonConsumable && returnQuantity < item.actual_quantity;

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
                    {isNonConsumable && (
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
                      max={item.actual_quantity}
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
            );
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