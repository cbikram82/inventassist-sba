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
import { Item } from '@/types/item';
import { User } from '@supabase/supabase-js';

interface CheckoutItem extends Item {
  checkout_task_id?: string;
  item_id?: string;
  item?: {
    name: string;
    category: string;
    quantity: number;
    description: string;
    created_at: string;
    updated_at: string;
  };
  original_quantity: number;
  actual_quantity: number;
  status: string;
  checked_by?: string;
  checked_at?: string;
  reason?: string;
}

interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event?: {
    id: string;
    name: string;
  };
  taskId?: string;
  items?: CheckoutItem[];
  type?: 'checkout' | 'checkin';
  onComplete: () => void;
  user: User | null;
}

type CheckoutError = {
  type: 'general'
  message: string
} | {
  type: 'item'
  itemId: string
  message: string
}

interface EventItemData {
  id: string
  event_name: string
  item_id: string
  item_name: string
  quantity: number
  created_at: string
  updated_at: string
  item: {
    id: string
    name: string
    category: string
    quantity: number
    description: string
    created_at: string
    updated_at: string
  }[]
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
  const [dialogItems, setDialogItems] = useState<CheckoutItem[]>(initialItems);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          if (taskId && dialogItems) {
            // If we have a taskId and items, use those directly
            const items = dialogItems.map(item => ({
              ...item,
              id: item.item_id || item.id,
              name: item.item?.name || '',
              category: item.item?.category || '',
              quantity: item.actual_quantity,
              description: item.item?.description || '',
              created_at: item.item?.created_at || new Date().toISOString(),
              updated_at: item.item?.updated_at || new Date().toISOString(),
              original_quantity: item.original_quantity,
              actual_quantity: item.actual_quantity,
              status: item.status
            }));
            setDialogItems(items);
          } else if (event?.name) {
            // Fetch event items
            const { data: eventItems, error } = await supabase
              .from('event_items')
              .select('*')
              .eq('event_name', event.name);

            if (error) throw error;

            const items = eventItems.map(item => ({
              id: item.id,
              name: item.name,
              category: item.category,
              quantity: item.quantity,
              description: item.description,
              created_at: item.created_at,
              updated_at: item.updated_at,
              original_quantity: item.quantity,
              actual_quantity: item.quantity,
              status: 'pending'
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
      initialQuantities[item.id] = item.quantity;
    });
    setSelectedItemsMap(initialChecked);
    setQuantities(initialQuantities);
    setDialogItems(dialogItems);
  }, [dialogItems]);

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

  const handleCheckout = async () => {
    if (!user) {
      setErrors([{ type: 'general', message: 'User not authenticated' }]);
      return;
    }

    if (!event?.id && !taskId) {
      setErrors([{ type: 'general', message: 'No event or task ID provided' }]);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      // Validate that at least one item is selected
      const selectedItems = dialogItems.filter(item => selectedItemsMap[item.id]);
      if (selectedItems.length === 0) {
        setErrors([{ type: 'general', message: 'Please select at least one item to check out' }]);
        return;
      }

      // Create checkout task
      const { data: task, error: taskError } = await supabase
        .from('checkout_tasks')
        .insert({
          event_id: event?.id,
          status: 'pending',
          created_by: user.id
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Create checkout items
      const checkoutItems = selectedItems.map(item => ({
        checkout_task_id: task.id,
        item_id: item.id,
        original_quantity: item.quantity,
        actual_quantity: quantities[item.id] || item.quantity,
        status: 'pending'
      }));

      const { error: itemsError } = await supabase
        .from('checkout_items')
        .insert(checkoutItems);

      if (itemsError) throw itemsError;

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
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-gray-500">
                    Category: {item.category}
                    {!categories.find(c => c.name === item.category)?.is_consumable && " (Non-Consumable)"}
                  </p>
                  <p className="text-sm text-gray-500">Available: {item.quantity}</p>
                </div>
              </div>
              
              {selectedItemsMap[item.id] && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max={item.quantity}
                    value={quantities[item.id] || 0}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value)
                      handleQuantityChange(item.id, newValue)
                    }}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-500">of {item.quantity}</span>
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