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
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>(() => {
    const initialQuantities: Record<string, number> = {};
    items.forEach(item => {
      initialQuantities[item.id] = item.actual_quantity;
    });
    return initialQuantities;
  });
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [reasonCodes, setReasonCodes] = useState<Record<string, string>>({})
  const [categories, setCategories] = useState<{ id: string; name: string; is_consumable: boolean }[]>([])

  useEffect(() => {
    const initialQuantities: Record<string, number> = {};
    items.forEach(item => {
      initialQuantities[item.id] = item.actual_quantity;
    });
    setReturnQuantities(initialQuantities);
    setReasons({});
    setReasonCodes({});

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

  const handleQuantityChange = (itemId: string, value: string) => {
    const newQuantity = parseInt(value);
    setReturnQuantities(prev => ({
      ...prev,
      [itemId]: isNaN(newQuantity) ? (prev[itemId] ?? 0) : newQuantity 
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
        console.log('Item:', item.item?.name, 'Category:', item.item?.category);
        console.log('Found category in DB:', itemCategory);
        
        // Make isConsumable check consistent with rendering logic
        const isConsumable = itemCategory ? itemCategory.is_consumable === true : false;
        console.log('Is consumable (Validation Check):', isConsumable, 'for item:', item.item?.name);

        // Basic validation for all items
        if (returnQuantity < 0) { // Prevent negative numbers explicitly
          toast({
            title: "Validation Error",
            description: `Return quantity cannot be negative for ${item.item?.name}`,
            variant: "destructive",
          });
          return;
        }
        
        // Allow return quantity of 0 only if a reason is provided for non-consumables
        // Existing check below handles returnQuantity > item.actual_quantity

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
            // Ensure reason code is selected and description is not empty
            if (!reasonCodes[item.id] || !reasons[item.id]?.trim()) { 
              toast({
                title: "Validation Error",
                description: `For non-consumable item ${item.item?.name}, you must return the exact quantity (${item.actual_quantity}) or provide both a valid reason code and a description.`,
                variant: "destructive",
              });
              return;
            }
          }
        }
      }

      // Proceed with check-in for each item
      for (const item of items) {
        const returnQuantity = returnQuantities[item.id] ?? 0; // Use ?? 0 for safety
        const itemCategory = categories.find(cat => cat.name === item.item?.category);
        // Use consistent check here too
        const isConsumable = itemCategory ? itemCategory.is_consumable === true : false; 
        const requiresReasonCheck = !isConsumable && returnQuantity !== item.actual_quantity;
        
        // Format reason only if required and provided
        const reason = requiresReasonCheck ? 
          `${reasonCodes[item.id]}: ${reasons[item.id]?.trim()}` : undefined;

        console.log('Processing check-in for:', item.item?.name);
        console.log('Is consumable (Processing Check):', isConsumable);
        console.log('Return quantity:', returnQuantity);
        console.log('Requires Reason Check:', requiresReasonCheck);
        console.log('Final Reason being sent:', reason);

        if (!user?.id) {
          throw new Error('User ID is required for check-in');
        }

        const { error } = await updateCheckoutItem(
          item.id,
          returnQuantity,
          'checked_in',
          user.id,
          reason // Pass potentially undefined reason
        );

        if (error) {
          // Throw the specific error from updateCheckoutItem
          throw error; 
        }
      }

      // Close dialog and refresh data
      onComplete();
      onClose();
    } catch (error) {
      console.error('Error during check-in:', error);
      toast({
        title: "Error",
        // Display the specific error message caught
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
            const isConsumable = itemCategory ? itemCategory.is_consumable === true : false;
            const currentReturnQuantity = Number(returnQuantities[item.id] ?? 0);
            const originalQuantity = Number(item.actual_quantity);
            
            console.log(`[Render Check - ${item.item?.name}]`);
            console.log(`  Category Found:`, itemCategory);
            console.log(`  Is Consumable Flag: ${itemCategory?.is_consumable}, Determined isConsumable: ${isConsumable}`);
            console.log(`  Current Return Qty (State): ${currentReturnQuantity} (Type: ${typeof currentReturnQuantity})`);
            console.log(`  Original Qty (Props): ${originalQuantity} (Type: ${typeof originalQuantity})`);
            console.log(`  Condition (!isConsumable): ${!isConsumable}`);
            console.log(`  Condition (currentReturnQuantity !== originalQuantity): ${currentReturnQuantity !== originalQuantity}`);
            
            const requiresReason = !isConsumable && currentReturnQuantity !== originalQuantity;

            console.log(`  => Requires Reason: ${requiresReason}`);

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
                      value={returnQuantities[item.id] ?? ''}
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