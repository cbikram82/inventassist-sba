"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { Loader2, Plus, Package, AlertTriangle, Printer, ShoppingCart } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { CheckoutDialog } from '@/components/checkout-dialog';
import { createCheckoutTask, getCheckoutTask } from '@/app/actions';
import { CheckoutItemWithDetails, CheckoutTaskState, CheckoutTaskType, CheckoutItemStatus } from '@/types/checkout';
import { useUser } from '@/lib/useUser';
import { CheckinDialog } from '@/components/checkin-dialog';

interface Item {
  id: string
  name: string
  description: string
  quantity: number
  category: string
  location: string
  person_name?: string
}

interface CheckoutItem {
  id: string;
  status: 'checked' | 'checked_in' | 'cancelled';
  actual_quantity: number;
  checked_by: string;
  checked_at: string;
  reason: string | null;
  user: {
    name: string;
  };
}

interface ProcessedEventItem {
  id: string;
  item_id: string;
  event_name: string;
  item_name: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  item: {
    id: string;
    name: string;
    category: string;
    quantity: number;
  };
  checkout_items: CheckoutItem[];
  remainingQuantity: number;
  is_checked_out: boolean;
  checkedOutQuantity: number;
  checkedInQuantity: number;
  last_checked_by?: string;
  last_checked_at?: string;
}

interface Event {
  id: string;
  name: string;
}

export default function EventItemsPage() {
  const { toast } = useToast()
  const { user } = useUser()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [eventItems, setEventItems] = useState<ProcessedEventItem[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>("")
  const [selectedItem, setSelectedItem] = useState<string>("")
  const [quantity, setQuantity] = useState<number>(0)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [availableEvents] = useState([
    "Sarasawati Puja",
    "Noboborsho",
    "Durga Puja",
    "Kaali Puja"
  ])
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [currentCheckoutTask, setCurrentCheckoutTask] = useState<CheckoutTaskState | null>(null);
  const [isCheckinDialogOpen, setIsCheckinDialogOpen] = useState(false);
  const [currentCheckinItems, setCurrentCheckinItems] = useState<CheckoutItemWithDetails[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState<CheckoutItemWithDetails[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | undefined>(undefined);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Add useEffect to fetch data when selectedEvent changes
  useEffect(() => {
    if (selectedEvent) {
      fetchData();
    } else {
      // Reset data when no event is selected
      setEventItems([]);
      setItems([]);
      setIsLoading(false);
    }
  }, [selectedEvent]);

  // Add useEffect to fetch items when component mounts
  useEffect(() => {
    const fetchInitialItems = async () => {
      try {
        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .select('*')
          .order('name');

        if (itemsError) throw itemsError;
        setItems(itemsData || []);
      } catch (err) {
        console.error('Error fetching initial items:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch items');
      }
    };

    fetchInitialItems();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all items first
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .order('name');

      if (itemsError) throw itemsError;
      setItems(itemsData || []); // Set items early

      // Fetch event items with all necessary details
      const { data: eventItemsData, error: eventItemsError } = await supabase
        .from('event_items')
        .select(`
          *,
          item:items (
            id,
            name,
            description,
            category,
            quantity
          ),
          checkout_items (
            id,
            actual_quantity,
            status,
            checked_by,
            checked_at,
            user:users!checkout_items_checked_by_fkey (
              id,
              name
            )
          )
        `)
        .eq('event_name', selectedEvent)
        .order('created_at', { ascending: false });

      if (eventItemsError) throw eventItemsError;

      // Process the event items safely
      const processedEventItems = (eventItemsData || []).map(eventItem => {
        try {
          // Ensure checkout_items is an array
          const checkoutItems = Array.isArray(eventItem.checkout_items) ? eventItem.checkout_items : [];
          
          // Calculate checked out and checked in quantities
          const checkedOutQuantity = checkoutItems
            .filter((ci: CheckoutItem) => ci.status === 'checked')
            .reduce((sum: number, ci: CheckoutItem) => sum + (Number(ci.actual_quantity) || 0), 0);

          const checkedInQuantity = checkoutItems
            .filter((ci: CheckoutItem) => ci.status === 'checked_in')
            .reduce((sum: number, ci: CheckoutItem) => sum + (Number(ci.actual_quantity) || 0), 0);

          // Calculate remaining quantity based on original quantity and checkouts/checkins
          const remainingQuantity = (Number(eventItem.quantity) || 0) - (checkedOutQuantity - checkedInQuantity);

          // Get last checkout/check-in details safely
          const lastCheckout = checkoutItems
            .filter((ci: CheckoutItem) => ci.status === 'checked' && ci.checked_at)
            .sort((a: CheckoutItem, b: CheckoutItem) => 
              (new Date(b.checked_at).getTime() || 0) - (new Date(a.checked_at).getTime() || 0)
            )[0];

          const lastCheckin = checkoutItems
            .filter((ci: CheckoutItem) => ci.status === 'checked_in' && ci.checked_at)
            .sort((a: CheckoutItem, b: CheckoutItem) => 
              (new Date(b.checked_at).getTime() || 0) - (new Date(a.checked_at).getTime() || 0)
            )[0];

          return {
            ...eventItem,
            checkout_items: checkoutItems, // Ensure it's always an array
            remainingQuantity,
            checkedOutQuantity,
            checkedInQuantity,
            lastCheckout, // Can be undefined
            lastCheckin,  // Can be undefined
            is_checked_out: checkedOutQuantity > checkedInQuantity,
            last_checked_by: lastCheckout?.user?.name || lastCheckin?.user?.name || null,
            last_checked_at: lastCheckout?.checked_at || lastCheckin?.checked_at || null
          };
        } catch (processingError) {
          console.error(`Error processing eventItem ID ${eventItem.id} (${eventItem.item_name}):`, processingError);
          // Return the original item or a structure indicating error, avoid crashing the whole map
          return {
            ...eventItem,
            checkout_items: Array.isArray(eventItem.checkout_items) ? eventItem.checkout_items : [],
            processingError: true // Add a flag to indicate issue
          };
        }
      });

      setEventItems(processedEventItems);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter event items based on selected event
  const filteredEventItems = selectedEvent
    ? eventItems.filter(item => item.event_name === selectedEvent)
    : [];

  const handleAddItem = async () => {
    if (!selectedEvent || !selectedItem || quantity <= 0) {
      toast({
        title: "Error",
        description: "Please select an event, item, and enter a valid quantity",
        variant: "destructive",
      })
      return
    }

    try {
      setIsAddingItem(true);
      const selectedItemData = items.find(item => item.id === selectedItem)
      if (!selectedItemData) throw new Error("Item not found")

      if (quantity > selectedItemData.quantity) {
        toast({
          title: "Error",
          description: "Requested quantity exceeds available stock",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase
        .from('event_items')
        .insert([{
          event_name: selectedEvent,
          item_id: selectedItem,
          item_name: selectedItemData.name,
          quantity: quantity
        }])

      if (error) throw error

      toast({
        title: "Success",
        description: "Item added to event list",
      })

      // Reset form
      setSelectedItem("")
      setQuantity(0)
      setIsDialogOpen(false)
      
      // Refresh data
      fetchData()
    } catch (error) {
      console.error('Error adding item:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add item",
        variant: "destructive",
      })
    } finally {
      setIsAddingItem(false);
    }
  }

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('event_items')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Item removed from event list",
      })

      fetchData()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove item",
        variant: "destructive",
      })
    }
  }

  const handleCheckout = async () => {
    if (!selectedEvent || !user?.id) return;

    try {
      // Get event ID from event name
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('name', selectedEvent)
        .single();

      if (eventError) throw eventError;

      // Create checkout task
      const { data: task, error: taskError } = await supabase
        .from('checkout_tasks')
        .insert({
          event_id: event.id,
          type: 'checkout',
          status: 'pending',
          created_by: user.id
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Set the current task and items
      setCurrentTaskId(task.id);
      setSelectedItems(eventItems.map(eventItem => ({
        id: eventItem.id,
        checkout_task_id: task.id,
        item_id: eventItem.item_id,
        event_item_id: eventItem.id,
        original_quantity: eventItem.quantity,
        actual_quantity: eventItem.quantity,
        status: 'pending' as CheckoutItemStatus,
        reason: null,
        checked_by: null,
        checked_at: null,
        returned_at: null,
        item: {
          name: eventItem.item.name,
          category: eventItem.item.category,
          quantity: eventItem.item.quantity
        },
        event_item: {
          quantity: eventItem.quantity
        }
      })));
      setShowCheckoutDialog(true);
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create checkout",
        variant: "destructive",
      });
    }
  };

  const handleCheckoutComplete = async () => {
    try {
      // Close dialog first
      setIsCheckoutDialogOpen(false);
      setCurrentCheckoutTask(null);
      
      // Then refresh data
      await fetchData();
      
      toast({
        title: "Success",
        description: "Checkout completed successfully",
      });
    } catch (error) {
      console.error('Error completing checkout:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete checkout",
        variant: "destructive",
      });
    }
  };

  const handleCheckin = async () => {
    if (!selectedEvent || !user?.id) return;

    try {
      // Get event ID from event name
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('name', selectedEvent)
        .single();

      if (eventError) throw eventError;

      // Get checked out items for the selected event
      const { data: checkoutItems, error } = await supabase
        .from('checkout_items')
        .select(`
          *,
          event_item:event_items (
            id,
            item_id,
            item_name,
            quantity,
            item:items (
              id,
              name,
              category,
              quantity
            )
          )
        `)
        .eq('status', 'checked')
        .eq('event_item.event_id', event.id);

      if (error) throw error;

      if (!checkoutItems || checkoutItems.length === 0) {
        toast({
          title: "No items to check in",
          description: "There are no checked out items for this event",
        });
        return;
      }

      // Create checkout task for checkin
      const { data: task, error: taskError } = await supabase
        .from('checkout_tasks')
        .insert({
          event_id: event.id,
          type: 'checkin',
          status: 'pending',
          created_by: user.id
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Set the current task and items
      setCurrentTaskId(task.id);
      setSelectedItems(checkoutItems.map(item => ({
        id: item.id,
        checkout_task_id: task.id,
        item_id: item.event_item.item_id,
        event_item_id: item.event_item.id,
        original_quantity: item.event_item.quantity,
        actual_quantity: item.quantity,
        status: 'checked' as CheckoutItemStatus,
        reason: null,
        checked_by: null,
        checked_at: null,
        returned_at: null,
        item: {
          name: item.event_item.item.name,
          category: item.event_item.item.category,
          quantity: item.event_item.item.quantity
        },
        event_item: {
          quantity: item.event_item.quantity
        }
      })));
      setIsCheckinDialogOpen(true);
    } catch (error) {
      console.error('Error preparing checkin:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to prepare checkin",
        variant: "destructive",
      });
    }
  };

  const handleCheckinComplete = async () => {
    try {
      // Close dialog first
      setIsCheckinDialogOpen(false);
      setCurrentCheckinItems([]);
      
      // Then refresh data
      await fetchData();
      
      toast({
        title: "Success",
        description: "Check-in completed successfully",
      });
    } catch (error) {
      console.error('Error completing checkin:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete checkin",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Event Items</h1>
        <div className="flex items-center gap-4">
          <Select
            value={selectedEvent}
            onValueChange={setSelectedEvent}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {availableEvents.map((event) => (
                <SelectItem key={event} value={event}>
                  {event}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => setShowAddDialog(true)} 
            className="w-full sm:w-auto"
            disabled={!selectedEvent}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
          <Button 
            onClick={handleCheckin}
            className="w-full sm:w-auto"
            disabled={!selectedEvent}
          >
            <Package className="h-4 w-4 mr-2" />
            Check In
          </Button>
        </div>
      </div>

      {selectedEvent ? (
        <>
          {/* Desktop View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventItems.map((eventItem) => (
                  <TableRow key={eventItem.id}>
                    <TableCell>{eventItem.item?.name}</TableCell>
                    <TableCell>{eventItem.item?.category}</TableCell>
                    <TableCell>{eventItem.quantity}</TableCell>
                    <TableCell>{eventItem.remainingQuantity}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCheckout()}
                        disabled={eventItem.remainingQuantity <= 0}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Checkout
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {eventItems.map((eventItem) => (
              <Card key={eventItem.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{eventItem.item?.name}</h3>
                      <p className="text-sm text-gray-500">{eventItem.item?.category}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-medium">Quantity: {eventItem.quantity}</p>
                      <p className="text-sm font-medium">Remaining: {eventItem.remainingQuantity}</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => handleCheckout()}
                      disabled={eventItem.remainingQuantity <= 0}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Checkout
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Please select an event to view and manage items
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Item to {selectedEvent}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleAddItem();
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item">Item</Label>
              <Select
                value={selectedItem}
                onValueChange={setSelectedItem}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.quantity} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isAddingItem}>
                {isAddingItem ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Item"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <CheckoutDialog
        isOpen={showCheckoutDialog}
        onClose={() => setShowCheckoutDialog(false)}
        items={selectedItems}
        onComplete={handleCheckoutComplete}
        taskId={currentTaskId}
        user={user}
        type="checkout"
      />

      {/* Checkin Dialog */}
      <CheckinDialog
        isOpen={isCheckinDialogOpen}
        onClose={() => setIsCheckinDialogOpen(false)}
        items={selectedItems}
        onComplete={handleCheckinComplete}
        taskId={currentTaskId || ''}
      />
    </div>
  )
} 