"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { CheckoutItemWithDetails, CheckoutItemStatus } from '@/types/checkout';
import { updateCheckoutItem, completeCheckoutTask, createAuditLog } from '@/app/actions';
import { useUser } from '@/lib/useUser';
import { Loader2 } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { User } from '@supabase/supabase-js';

interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event?: {
    id: string;
    name: string;
  };
  taskId?: string;
  items?: CheckoutItemWithDetails[];
  type?: 'checkout' | 'checkin';
  onComplete: () => void;
  user: User | null;
}

export function CheckoutDialog({
  isOpen,
  onClose,
  event,
  taskId,
  items: initialItems = [],
  type = 'checkout',
  onComplete,
  user
}: CheckoutDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Array<{ type: 'general' | 'item'; itemId?: string; message: string }>>([]);
  const [selectedItemsMap, setSelectedItemsMap] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<{ id: string; name: string; is_consumable: boolean }[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [dialogItems, setDialogItems] = useState<CheckoutItemWithDetails[]>(initialItems);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          if (taskId && dialogItems) {
            // If we have a taskId and items, use those directly
            setDialogItems(dialogItems);
          } else if (event?.name) {
            // Fetch event items
            const { data: eventItems, error } = await supabase
              .from('event_items')
              .select('*')
              .eq('event_name', event.name);

            if (error) throw error;

            const items = eventItems.map(item => ({
              id: item.id,
              event_item_id: item.id,
              item_id: item.item_id,
              checkout_task_id: taskId || '',
              original_quantity: item.quantity,
              actual_quantity: item.quantity,
              status: 'pending' as CheckoutItemStatus,
              reason: null,
              checked_by: null,
              checked_at: null,
              returned_at: null,
              event_item: {
                id: item.id,
                event_name: event.name,
                item_id: item.item_id,
                quantity: item.quantity,
                created_at: item.created_at,
                updated_at: item.updated_at
              },
              item: {
                id: item.item_id,
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                description: item.description,
                created_at: item.created_at,
                updated_at: item.updated_at
              }
            }));

            setDialogItems(items);
          }

          // Fetch categories
          const { data: categoriesData, error: categoriesError } = await supabase
            .from('categories')
            .select('id, name, is_consumable')
            .order('name')

          if (categoriesError) throw categoriesError

          setCategories(categoriesData || [])
        } catch (error) {
          console.error('Error fetching data:', error)
          setErrors([{ type: 'general', message: 'Failed to fetch data' }])
        }
      }

      fetchData()
    }
  }, [isOpen, event?.name, taskId, dialogItems])

  useEffect(() => {
    // Initialize checked items and quantities
    const initialChecked: Record<string, boolean> = {};
    const initialQuantities: Record<string, number> = {};
    dialogItems.forEach(item => {
      initialChecked[item.id] = false;
      initialQuantities[item.id] = item.actual_quantity;
    });
    setSelectedItemsMap(initialChecked);
    setQuantities(initialQuantities);
  }, [dialogItems]);

  const handleQuantityChange = (itemId: string, value: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleCheckout = async () => {
    console.log('Starting checkout process...');
    console.log('Selected items:', dialogItems.filter(item => selectedItemsMap[item.id]));
    console.log('Quantities:', quantities);

    if (!user) {
      console.error('No user found');
      setErrors([{ type: 'general', message: 'User not authenticated' }]);
      return;
    }

    if (!event?.id && !taskId) {
      console.error('No event ID or task ID provided');
      setErrors([{ type: 'general', message: 'No event or task ID provided' }]);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      // Validate that at least one item is selected
      const selectedItems = dialogItems.filter(item => selectedItemsMap[item.id]);
      if (selectedItems.length === 0) {
        console.error('No items selected');
        setErrors([{ type: 'general', message: 'Please select at least one item to check out' }]);
        return;
      }

      console.log('Creating checkout task...');
      // Create checkout task
      const { data: task, error: taskError } = await supabase
        .from('checkout_tasks')
        .insert({
          event_id: event?.id,
          status: 'in_progress',
          type: type,
          created_by: user.id
        })
        .select()
        .single();

      if (taskError) {
        console.error('Error creating checkout task:', taskError);
        throw taskError;
      }

      console.log('Checkout task created:', task);

      // Process each item
      for (const item of selectedItems) {
        const checkoutQuantity = quantities[item.id] || item.actual_quantity;

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
            quantity: (currentItem?.quantity || 0) - checkoutQuantity
          })
          .eq('id', item.item_id);

        if (updateQuantityError) throw updateQuantityError;

        // Create checkout item with checked status
        const { error: checkoutItemError } = await supabase
          .from('checkout_items')
          .insert({
            checkout_task_id: task.id,
            item_id: item.item_id,
            original_quantity: item.original_quantity,
            actual_quantity: checkoutQuantity,
            status: 'checked',
            checked_by: user.id,
            checked_at: new Date().toISOString()
          });

        if (checkoutItemError) throw checkoutItemError;

        // Create audit log
        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert({
            user_id: user.id,
            action: 'checkout',
            item_id: item.item_id,
            checkout_task_id: task.id,
            quantity_change: -checkoutQuantity
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
        .eq('id', task.id);

      if (updateTaskError) throw updateTaskError;

      toast({
        title: 'Success',
        description: 'Items checked out successfully'
      });

      onComplete();
      onClose();
    } catch (error) {
      console.error('Error during checkout:', error);
      setErrors([{ type: 'general', message: 'Failed to process checkout' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {event?.name ? `Check Out Items for ${event.name}` : 'Check Out Items'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {dialogItems.map((item) => (
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
                  <p className="text-sm text-gray-500">Available: {item.actual_quantity}</p>
                </div>
              </div>
              
              {selectedItemsMap[item.id] && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max={item.actual_quantity}
                    value={quantities[item.id] || 0}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value)
                      handleQuantityChange(item.id, newValue)
                    }}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-500">of {item.actual_quantity}</span>
                </div>
              )}
              
              {errors.find(e => e.type === 'item' && e.itemId === item.id) && (
                <p className="text-sm text-red-500">
                  {errors.find(e => e.type === 'item' && e.itemId === item.id)?.message}
                </p>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCheckout} disabled={loading}>
            {loading ? "Checking Out..." : "Check Out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 