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

interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    name: string;
  };
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

export function CheckoutDialog({ isOpen, onClose, event, onComplete }: CheckoutDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<CheckoutError[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; is_consumable: boolean }[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedItemsMap, setSelectedItemsMap] = useState<Record<string, boolean>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!event?.name) return;

      try {
        // Fetch event items
        const { data: eventItems, error: eventItemsError } = await supabase
          .from('event_items')
          .select(`
            id,
            event_name,
            item_id,
            item_name,
            quantity,
            created_at,
            updated_at,
            item:items (
              id,
              name,
              category,
              quantity,
              description,
              created_at,
              updated_at
            )
          `)
          .eq('event_name', event.name);

        if (eventItemsError) throw eventItemsError;

        // Transform the data to match our Item type
        const transformedItems = (eventItems || []).map(ei => ({
          id: ei.item_id || '',
          name: ei.item_name || '',
          category: ei.item?.[0]?.category || '',
          quantity: ei.quantity || 0,
          description: ei.item?.[0]?.description || '',
          created_at: ei.item?.[0]?.created_at || ei.created_at || new Date().toISOString(),
          updated_at: ei.item?.[0]?.updated_at || ei.updated_at || new Date().toISOString()
        }));

        setItems(transformedItems);

        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name, is_consumable')
          .order('name');

        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);
      } catch (error) {
        console.error('Error in fetchData:', error);
        setErrors([{ type: 'general', message: 'Failed to fetch items' }]);
      }
    };

    if (isOpen && event?.name) {
      fetchData();
    }
  }, [isOpen, event?.name]);

  useEffect(() => {
    // Initialize checked items and quantities
    const initialChecked: Record<string, boolean> = {};
    const initialQuantities: Record<string, number> = {};
    items.forEach(item => {
      initialChecked[item.id] = false;
      initialQuantities[item.id] = item.quantity;
    });
    setSelectedItemsMap(initialChecked);
    setQuantities(initialQuantities);
    setItems(items);
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

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setErrors([]);

      // Validate that at least one item is selected
      const selectedItems = items.filter(item => selectedItemsMap[item.id]);
      if (selectedItems.length === 0) {
        setErrors([{ type: 'general', message: 'Please select at least one item to check out' }]);
        return;
      }

      // Process each selected item
      for (const item of selectedItems) {
        const quantity = quantities[item.id] || 0;
        if (quantity <= 0) {
          setErrors([{ type: 'item', itemId: item.id, message: 'Quantity must be greater than 0' }]);
          return;
        }
        if (quantity > item.quantity) {
          setErrors([{ type: 'item', itemId: item.id, message: `Quantity cannot exceed available quantity (${item.quantity})` }]);
          return;
        }

        // Update item quantity
        const { error: updateError } = await supabase
          .from('items')
          .update({ quantity: item.quantity - quantity })
          .eq('id', item.id);

        if (updateError) throw updateError;

        // Create audit log
        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert({
            item_id: item.id,
            action: 'checkout',
            quantity_change: -quantity,
            user_id: user?.id
          });

        if (auditError) throw auditError;
      }

      toast({
        title: 'Success',
        description: 'Items checked out successfully',
      });
      onComplete();
    } catch (error) {
      console.error('Error checking out items:', error);
      setErrors([{ type: 'general', message: 'Failed to check out items' }]);
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