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
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  items: CheckoutItemWithDetails[];
  type: 'checkout' | 'checkin';
  onComplete: () => void;
}

type CheckoutError = {
  type: 'general'
  message: string
} | {
  type: 'item'
  itemId: string
  message: string
}

export function CheckoutDialog({
  isOpen,
  onClose,
  taskId,
  items: initialItems,
  type,
  onComplete
}: CheckoutDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<CheckoutError[]>([]);

  useEffect(() => {
    // Initialize checked items and quantities
    const initialChecked: Record<string, boolean> = {};
    const initialQuantities: Record<string, number> = {};
    initialItems.forEach(item => {
      initialChecked[item.id] = false;
      initialQuantities[item.id] = item.original_quantity;
    });
    setCheckedItems(initialChecked);
    setQuantities(initialQuantities);
    setItems(initialItems);
  }, [initialItems]);

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

  const handleComplete = async () => {
    try {
      setLoading(true);
      setErrors([]);

      // Validate that at least one item is selected
      const selectedItems = items.filter(item => checkedItems[item.id]);
      if (selectedItems.length === 0) {
        setErrors([{ type: 'general', message: "Please select at least one item to check out" }]);
        return;
      }

      // Validate all items first
      for (const item of selectedItems) {
        const quantity = quantities[item.id] || 0;
        if (quantity <= 0) {
          setErrors([{ type: 'item', itemId: item.id, message: "Quantity must be greater than 0" }]);
          return;
        }
        if (quantity > item.original_quantity) {
          setErrors([{ type: 'item', itemId: item.id, message: `Quantity cannot exceed available quantity (${item.original_quantity})` }]);
          return;
        }
      }

      // Start a transaction
      const { data: transaction, error: transactionError } = await supabase.rpc('begin_transaction');
      if (transactionError) throw transactionError;

      try {
        // Create checkout task
        const { data: task, error: taskError } = await supabase
          .from('checkout_tasks')
          .insert({
            event_id: taskId,
            status: 'in_progress',
            type: 'checkout',
            created_by: user?.id
          })
          .select()
          .single();

        if (taskError) throw taskError;

        // Process each item within the transaction
        for (const item of selectedItems) {
          const quantity = quantities[item.id] || 0;

          // Create checkout item
          const { error: itemError } = await supabase
            .from('checkout_items')
            .insert({
              checkout_task_id: task.id,
              item_id: item.id,
              original_quantity: quantity,
              actual_quantity: quantity,
              status: 'checked_out',
              checked_by: user?.id
            });

          if (itemError) throw itemError;

          // Update item quantity
          const { error: updateError } = await supabase
            .from('items')
            .update({
              quantity: item.original_quantity - quantity
            })
            .eq('id', item.id);

          if (updateError) throw updateError;

          // Create audit log
          const { error: auditError } = await supabase
            .from('audit_logs')
            .insert({
              item_id: item.id,
              action: 'checkout',
              quantity_change: -quantity,
              user_id: user?.id,
              checkout_task_id: task.id
            });

          if (auditError) throw auditError;
        }

        // Commit the transaction if all operations succeed
        const { error: commitError } = await supabase.rpc('commit_transaction');
        if (commitError) throw commitError;

        toast({
          title: "Success",
          description: "Items checked out successfully",
        });
        onComplete();
      } catch (error) {
        // Rollback the transaction if any operation fails
        const { error: rollbackError } = await supabase.rpc('rollback_transaction');
        if (rollbackError) {
          console.error('Error rolling back transaction:', rollbackError);
        }
        throw error;
      }
    } catch (error) {
      console.error('Error checking out items:', error);
      setErrors([{ type: 'general', message: "Failed to check out items. Please try again." }]);
    } finally {
      setLoading(false);
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

        {errors.some(e => e.type === 'general') && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md">
            {errors.find(e => e.type === 'general')?.message}
          </div>
        )}

        <div className="space-y-4">
          {items.map((item) => (
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
                <div className="font-medium">{item.item?.name}</div>
                <div className="text-sm text-muted-foreground">
                  Category: {item.item?.category}
                </div>
                <div className="text-sm text-muted-foreground">
                  Original Quantity: {item.original_quantity}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max={item.original_quantity}
                  value={item.actual_quantity}
                  onChange={(e) => {
                    const newItems = items.map(i => 
                      i.id === item.id 
                        ? { ...i, actual_quantity: parseInt(e.target.value) || 0 }
                        : i
                    );
                    setItems(newItems);
                  }}
                  className="w-24"
                />
                {type === 'checkin' && ['Equipment', 'Furniture', 'Electronics'].includes(item.item?.category || '') && 
                  item.actual_quantity !== item.original_quantity && (
                    <Input
                      placeholder="Reason for mismatch"
                      value={reasons[item.id] || ''}
                      onChange={(e) => handleReasonChange(item.id, e.target.value)}
                      className="w-48"
                    />
                )}
              </div>
              {errors.find(e => e.type === 'item' && e.itemId === item.id) && (
                <p className="text-sm text-red-500">
                  {errors.find(e => e.type === 'item' && e.itemId === item.id)?.message}
                </p>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            onClick={handleComplete}
            disabled={loading}
          >
            {loading ? (
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