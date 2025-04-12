"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { Loader2, Plus, Package, AlertTriangle, Printer, ArrowUpRight, MoreHorizontal } from "lucide-react"
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
import { CheckoutItemWithDetails, CheckoutTaskState, CheckoutTaskType } from '@/types/checkout';
import { useUser } from '@/lib/useUser';
import { CheckinDialog } from '@/components/checkin-dialog';
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Item {
  id: string;
  name: string;
  category: string;
  quantity: number;
}

interface Category {
  id: string;
  name: string;
}

interface CheckoutItem {
  id: string;
  event_item_id: string;
  status: 'pending' | 'checked' | 'checked_in' | 'cancelled';
  quantity: number;
  actual_quantity: number;
  checked_at: string;
  checked_by: string;
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
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [selectedEventItem, setSelectedEventItem] = useState<ProcessedEventItem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  const handleCheckout = async (type: CheckoutTaskType) => {
    if (!selectedEvent || !user?.id) return;

    try {
      // Get the session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      // Call the API route to create checkout task
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          eventName: selectedEvent,
          type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout task');
      }

      const taskWithItems = await response.json();

      if (taskWithItems && taskWithItems.checkout_items) {
        setCurrentCheckoutTask({
          id: taskWithItems.id,
          items: taskWithItems.checkout_items,
          type
        });

        setIsCheckoutDialogOpen(true);
      }
    } catch (error) {
      console.error('Error creating checkout task:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create checkout task",
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
    try {
      // Get checked out items for the selected event
      const { data: checkoutItems, error } = await supabase
        .from('checkout_items')
        .select(`
          *,
          item:items (
            id,
            name,
            category,
            quantity
          ),
          checkout_task:checkout_tasks (
            event_name
          )
        `)
        .eq('status', 'checked')
        .eq('checkout_task.event_name', selectedEvent)

      if (error) throw error

      if (!checkoutItems || checkoutItems.length === 0) {
        toast({
          title: "No items to check in",
          description: "There are no checked out items for this event",
        })
        return
      }

      // Set the items for check-in
      setCurrentCheckinItems(checkoutItems);
      setIsCheckinDialogOpen(true);
    } catch (error) {
      console.error('Error preparing checkin:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to prepare checkin",
        variant: "destructive",
      })
    }
  }

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
    <div className="space-y-4 p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Event Items</h1>
          <p className="text-muted-foreground">
            Manage items for {selectedEvent}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="w-full md:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Items
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCheckoutDialog(true)}
            className="w-full md:w-auto"
          >
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Checkout Items
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                  Item
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                  Category
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                  Quantity
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                  Remaining
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                  Status
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {filteredEventItems.map((eventItem) => {
                const item = items.find(i => i.id === eventItem.item_id);
                const category = categories?.find((c: Category) => c.id === item?.category);
                const checkoutItems = checkoutItemsData?.filter((ci: CheckoutItem) => ci.event_item_id === eventItem.id) || [];
                const checkedOutQuantity = checkoutItems
                  .filter((ci: CheckoutItem) => ci.status === 'checked')
                  .reduce((sum: number, ci: CheckoutItem) => sum + (ci.quantity || 0), 0);
                const checkedInQuantity = checkoutItems
                  .filter((ci: CheckoutItem) => ci.status === 'checked_in')
                  .reduce((sum: number, ci: CheckoutItem) => sum + (ci.quantity || 0), 0);
                const remainingQuantity = (Number(eventItem.quantity) || 0) - (checkedOutQuantity - checkedInQuantity);

                return (
                  <tr key={eventItem.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="flex flex-col">
                        <span className="font-medium">{item?.name}</span>
                        <span className="text-sm text-muted-foreground md:hidden">
                          {category?.name} • Qty: {eventItem.quantity} • Remaining: {remainingQuantity}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 hidden md:table-cell">
                      {category?.name}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 hidden md:table-cell">
                      {eventItem.quantity}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 hidden md:table-cell">
                      {remainingQuantity}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <Badge variant={remainingQuantity > 0 ? "default" : "destructive"}>
                        {remainingQuantity > 0 ? "Available" : "Checked Out"}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedEventItem(eventItem);
                              setShowEditDialog(true);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedEventItem(eventItem);
                              setShowDeleteDialog(true);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {currentCheckoutTask && currentCheckoutTask.type === 'checkout' && (
        <CheckoutDialog
          isOpen={isCheckoutDialogOpen}
          onClose={() => {
            setIsCheckoutDialogOpen(false);
            setCurrentCheckoutTask(null);
          }}
          taskId={currentCheckoutTask.id}
          items={currentCheckoutTask.items}
          type="checkout"
          onComplete={handleCheckoutComplete}
          user={user}
        />
      )}

      {currentCheckoutTask && currentCheckoutTask.type === 'checkin' && (
        <CheckinDialog
          isOpen={isCheckoutDialogOpen}
          onClose={() => {
            setIsCheckoutDialogOpen(false);
            setCurrentCheckoutTask(null);
          }}
          items={currentCheckoutTask.items}
          onComplete={handleCheckoutComplete}
          taskId={currentCheckoutTask.id}
        />
      )}

      {currentCheckinItems.length > 0 && (
        <CheckinDialog
          isOpen={isCheckinDialogOpen}
          onClose={() => {
            setIsCheckinDialogOpen(false);
            setCurrentCheckinItems([]);
          }}
          items={currentCheckinItems}
          onComplete={handleCheckinComplete}
          taskId={currentCheckinItems[0]?.checkout_task_id}
        />
      )}

      <style jsx global>{`
        @media print {
          body {
            padding: 20px;
          }
          .no-print {
            display: none;
          }
          .print-only {
            display: block;
          }
        }
      `}</style>
    </div>
  )
} 