"use client"

import { useState, useEffect } from "react"
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

      console.log('Fetched categories:', data)
      setCategories(data || [])
    }

    if (isOpen) {
      fetchCategories()
    }
  }, [isOpen, toast])

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
        const itemCategory = categories.find(cat => cat.name === item.item?.category);
        console.log('Item category:', itemCategory, 'for item:', item.item?.name);
        
        // If category is not found or is_consumable is false, treat as non-consumable
        const isConsumable = itemCategory?.is_consumable === true;
        console.log('Is consumable:', isConsumable, 'for item:', item.item?.name);

        // Basic validation for all items
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

        // Category-specific validation
        if (!isConsumable) {
          console.log('Validating non-consumable item:', item.item?.name);
          // For non-consumable items, require exact return or valid reason
          if (returnQuantity !== item.actual_quantity) {
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
        const itemCategory = categories.find(cat => cat.name === item.item?.category);
        const isConsumable = itemCategory?.is_consumable === true;
        const reason = !isConsumable && returnQuantity !== item.actual_quantity ? 
          `${reasonCodes[item.id]}: ${reasons[item.id]}` : undefined;

        if (!user?.id) {
          throw new Error('User ID is required for check-in');
        }

        // Use updateCheckoutItem function which has the correct quantity calculation logic
        const { error } = await updateCheckoutItem(
          item.id,
          returnQuantity,
          'checked_in',
          user.id,
          reason
        );

        if (error) {
          throw new Error(`Error checking in item: ${error.message}`);
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
            const itemCategory = categories.find(cat => cat.name === item.item?.category);
            const isConsumable = itemCategory?.is_consumable === true;
            const returnQuantity = returnQuantities[item.id] || 0;
            const requiresReason = !isConsumable && returnQuantity !== item.actual_quantity;

            console.log('Rendering item:', item.item?.name, 'category:', itemCategory, 'isConsumable:', isConsumable, 'requiresReason:', requiresReason);

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