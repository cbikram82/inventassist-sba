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
  const [reasonVisibility, setReasonVisibility] = useState<Record<string, boolean>>({})
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0)

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

  const handleQuantityChange = (itemId: string, value: string) => {
    const newQuantity = parseInt(value)
    const numericNewQuantity = isNaN(newQuantity) ? (returnQuantities[itemId] ?? 0) : newQuantity

    let shouldBeVisible = false
    const item = items.find(i => i.id === itemId)
    if (item) {
      const itemCategory = categories.find(cat => cat.name === item.item?.category)
      const isConsumable = itemCategory ? itemCategory.is_consumable === true : false
      const originalQuantity = Number(item.actual_quantity)
      shouldBeVisible = !isConsumable && numericNewQuantity !== originalQuantity
    } else {
       console.warn(`Item with ID ${itemId} not found for visibility calculation.`)
    }

    setReturnQuantities(prev => ({
      ...prev,
      [itemId]: numericNewQuantity
    }))
    setReasonVisibility(prev => ({
      ...prev,
      [itemId]: shouldBeVisible
    }))
    setForceUpdateCounter(c => c + 1)

    console.log(`[handleQuantityChange - ${item?.item?.name}] Set Visibility to: ${shouldBeVisible}, Force Cnt: ${forceUpdateCounter + 1}`)
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

      // --- Combined Validation and Submission Loop ---
      for (const item of items) {
        const returnQuantity = returnQuantities[item.id] ?? 0;
        const originalQuantity = Number(item.actual_quantity);
        const itemCategory = categories.find(cat => cat.name === item.item?.category);
        const isConsumable = itemCategory ? itemCategory.is_consumable === true : false;

        // 1. Basic quantity validation
        if (returnQuantity < 0) {
          throw new Error(`Return quantity cannot be negative for ${item.item?.name}`);
        }
        if (returnQuantity > originalQuantity) {
          throw new Error(`Return quantity cannot exceed checked out quantity (${originalQuantity}) for ${item.item?.name}`);
        }

        // 2. Determine if reason is needed based on current values
        const reasonIsNeeded = !isConsumable && returnQuantity !== originalQuantity;
        let reasonToSend: string | undefined = undefined;
        
        // 3. Check if reason is needed and if UI *should* have shown the fields
        if (reasonIsNeeded) {
          const shouldUIVisible = reasonVisibility[item.id] === true;
          const currentReasonCode = reasonCodes[item.id];
          const currentReasonDesc = reasons[item.id]?.trim();

          console.log(`[Submit Check - ${item.item?.name}] Reason Needed: ${reasonIsNeeded}, UI Should Be Visible State: ${shouldUIVisible}, Code Provided: ${!!currentReasonCode}, Desc Provided: ${!!currentReasonDesc}`);

          if (!shouldUIVisible) {
             console.error(`[Submit Check - ${item.item?.name}] Internal State Error: Reason required but reasonVisibility state was false. Qty: ${returnQuantity}/${originalQuantity}, isConsumable: ${isConsumable}`);
             throw new Error(`Internal state error for ${item.item?.name}. Please refresh and try again.`);
          }
          
          if (!currentReasonCode || !currentReasonDesc) {
               console.error(`[Submit Check - ${item.item?.name}] Client Input Error: Reason required and UI visible, but input missing.`);
               throw new Error(`Reason required for ${item.item?.name} but not provided. Please fill in the reason details.`);
           }
           
           reasonToSend = `${currentReasonCode}: ${currentReasonDesc}`;
        }
        
        console.log(`  => Reason to Send:`, reasonToSend);

        if (!user?.id) {
          throw new Error('User ID is required for check-in');
        }

        // 4. Call the backend action
        const { error } = await updateCheckoutItem(item.id, returnQuantity, 'checked_in', user.id, reasonToSend);
        if (error) {
          console.error(`Backend Error for ${item.item?.name}:`, error);
          throw error; 
        }
      }
      onComplete();
      onClose();
    } catch (error) { 
      console.error('Error during check-in process:', error);
      toast({
        title: "Check-in Error",
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
            const itemCategory = categories.find(cat => cat.name === item.item?.category)
            const isConsumable = itemCategory ? itemCategory.is_consumable === true : false
            const currentReturnQuantity = returnQuantities[item.id] ?? ''
            const visibleState = reasonVisibility[item.id] === true

            const _forceUpdateRead = forceUpdateCounter

            return (
              <div key={item.id} className="space-y-2 p-4 border rounded-lg relative">
                <div style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(255,255,0,0.7)', padding: '2px 4px', fontSize: '9px', lineHeight: '1.1', zIndex: 10 }}>
                  DEBUG (F{_forceUpdateRead}):<br />
                  isC: {isConsumable.toString()}<br />
                  retQ: {currentReturnQuantity}<br />
                  origQ: {item.actual_quantity}<br />
                  visState: {visibleState.toString()}
                </div>
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
                      value={currentReturnQuantity}
                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                    />
                  </div>
                </div>

                {visibleState && (
                  <div className="space-y-2 border-t pt-2 mt-2 border-dashed">
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