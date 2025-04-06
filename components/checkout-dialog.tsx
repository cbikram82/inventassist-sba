"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { CheckoutItemWithDetails } from '@/types/checkout';
import { updateCheckoutItem, completeCheckoutTask, createAuditLog } from '@/app/actions';
import { useUser } from '@/lib/useUser';
import { Loader2 } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';

interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  items: CheckoutItemWithDetails[];
  type: 'checkout' | 'checkin';
  onComplete: () => void;
}

export function CheckoutDialog({
  isOpen,
  onClose,
  taskId,
  items,
  type,
  onComplete
}: CheckoutDialogProps) {
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize checked items and quantities
    const initialChecked: Record<string, boolean> = {};
    const initialQuantities: Record<string, number> = {};
    items.forEach(item => {
      initialChecked[item.id] = false;
      initialQuantities[item.id] = item.original_quantity;
    });
    setCheckedItems(initialChecked);
    setQuantities(initialQuantities);
  }, [items]);

  const handleQuantityChange = (itemId: string, value: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleReasonChange = (itemId: string, value: string) => {
    setReasons(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Process each checked item
      for (const item of items) {
        if (checkedItems[item.id]) {
          const newQuantity = quantities[item.id];
          const reason = reasons[item.id];

          // For non-consumable items during check-in, validate quantities
          const isNonConsumable = ['Equipment', 'Furniture', 'Electronics'].includes(item.item.category);
          const isCheckin = type === 'checkin';
          
          if (isNonConsumable && isCheckin && newQuantity !== item.original_quantity && !reason) {
            throw new Error(`Please provide a reason for quantity mismatch for ${item.item.name}`);
          }

          await updateCheckoutItem(
            item.id,
            newQuantity,
            type === 'checkout' ? 'checked' : 'returned',
            item.checked_by || '',
            reason
          );
        }
      }

      // Complete the checkout task
      await completeCheckoutTask(taskId);
      onComplete();
      onClose();
    } catch (err) {
      console.error('Error processing checkout:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during checkout');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {type === 'checkout' ? 'Check Out Items' : 'Check In Items'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
              <Checkbox
                checked={checkedItems[item.id]}
                onCheckedChange={(checked) => {
                  setCheckedItems(prev => ({
                    ...prev,
                    [item.id]: checked as boolean
                  }));
                }}
              />
              <div className="flex-1">
                <div className="font-medium">{item.item.name}</div>
                <div className="text-sm text-muted-foreground">
                  Category: {item.item.category}
                </div>
                <div className="text-sm text-muted-foreground">
                  Original Quantity: {item.original_quantity}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={quantities[item.id]}
                  onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                  className="w-24"
                />
                {type === 'checkin' && ['Equipment', 'Furniture', 'Electronics'].includes(item.item.category) && 
                 quantities[item.id] !== item.original_quantity && (
                  <Input
                    placeholder="Reason for mismatch"
                    value={reasons[item.id] || ''}
                    onChange={(e) => handleReasonChange(item.id, e.target.value)}
                    className="w-48"
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              type === 'checkout' ? 'Check Out' : 'Check In'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 