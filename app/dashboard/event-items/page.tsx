"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { Loader2, Plus, Package, AlertTriangle, Printer } from "lucide-react"
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

interface Item {
  id: string
  name: string
  description: string
  quantity: number
  category: string
  location: string
  person_name?: string
}

interface ProcessedEventItem {
  id: string
  event_name: string
  item_id: string
  item_name: string
  quantity: number
  created_at: string
  updated_at: string
  remaining_quantity: number
  is_checked_out: boolean
  last_checked_by?: string
  last_checked_at?: string
  checkout_items?: CheckoutItemWithDetails[]
  item?: {
    quantity: number
  }
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

  // Filter event items based on selected event
  const filteredEventItems = selectedEvent
    ? eventItems.filter(item => item.event_name === selectedEvent)
    : eventItems

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch all items
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .order('name')

      if (itemsError) throw itemsError

      // Fetch event items with checkout information
      const { data: eventItemsData, error: eventItemsError } = await supabase
        .from('event_items')
        .select(`
          *,
          item:items (
            quantity
          ),
          checkout_items (
            status,
            checked_by,
            checked_at,
            user:users!fk_checked_by (
              name
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (eventItemsError) throw eventItemsError

      // Calculate remaining quantities and add checkout status
      const processedEventItems = eventItemsData?.map(eventItem => {
        const checkedOutQuantity = eventItem.checkout_items
          ?.filter((ci: CheckoutItemWithDetails) => ci.status === 'checked')
          .reduce((sum: number, ci: CheckoutItemWithDetails) => sum + ci.actual_quantity, 0) || 0;

        const checkedInQuantity = eventItem.checkout_items
          ?.filter((ci: CheckoutItemWithDetails) => ci.status === 'checked_in')
          .reduce((sum: number, ci: CheckoutItemWithDetails) => sum + ci.actual_quantity, 0) || 0;

        const lastCheckout = eventItem.checkout_items
          ?.sort((a: CheckoutItemWithDetails, b: CheckoutItemWithDetails) => {
            const dateA = a.checked_at ? new Date(a.checked_at).getTime() : 0;
            const dateB = b.checked_at ? new Date(b.checked_at).getTime() : 0;
            return dateB - dateA;
          })[0];

        const originalQuantity = eventItem.item?.quantity || 0;
        const remainingQuantity = originalQuantity - (checkedOutQuantity - checkedInQuantity);

        // Check if any checkout item has status 'checked' or 'checked_in'
        const isCheckedOut = eventItem.checkout_items?.some((ci: CheckoutItemWithDetails) => ci.status === 'checked') || false;
        const isCheckedIn = eventItem.checkout_items?.some((ci: CheckoutItemWithDetails) => ci.status === 'checked_in') || false;

        return {
          ...eventItem,
          quantity: originalQuantity,
          remaining_quantity: remainingQuantity,
          is_checked_out: isCheckedOut && !isCheckedIn,
          last_checked_by: lastCheckout?.user?.name,
          last_checked_at: lastCheckout?.checked_at
        };
      }) || [];

      setItems(itemsData || [])
      setEventItems(processedEventItems)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleCheckoutComplete = () => {
    // Refresh the event items list
    fetchData();
    setCurrentCheckoutTask(null);
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

      setCurrentCheckinItems(checkoutItems)
      setIsCheckinDialogOpen(true)
    } catch (error) {
      console.error('Error preparing checkin:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to prepare checkin",
        variant: "destructive",
      })
    }
  }

  const handleCheckinComplete = () => {
    fetchData()
    setCurrentCheckinItems([])
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
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
    <div className="space-y-4 p-3 md:space-y-6 md:p-6">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl md:text-3xl font-bold tracking-tight">Event Items List</h2>
          <p className="text-sm text-muted-foreground">
            Manage items for different events
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Event Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEvents.map(event => (
                      <SelectItem key={event} value={event}>
                        {event}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!selectedEvent}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Item to Event</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="item">Item</Label>
                        <Select value={selectedItem} onValueChange={setSelectedItem}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an item" />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map(item => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name} ({item.quantity} available)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <Button onClick={handleAddItem}>Add Item</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {selectedEvent && (
                  <div className="flex gap-4">
                    <Button
                      onClick={() => handleCheckout('checkout')}
                      disabled={!selectedEvent || filteredEventItems.length === 0}
                    >
                      Check Out Items
                    </Button>
                    <Button
                      onClick={() => handleCheckout('checkin')}
                      disabled={!selectedEvent || filteredEventItems.length === 0}
                    >
                      Check In Items
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {currentCheckoutTask && (
          <CheckoutDialog
            isOpen={isCheckoutDialogOpen}
            onClose={() => setIsCheckoutDialogOpen(false)}
            taskId={currentCheckoutTask.id}
            items={currentCheckoutTask.items}
            type={currentCheckoutTask.type}
            onComplete={handleCheckoutComplete}
          />
        )}

        {currentCheckinItems.length > 0 && (
          <CheckinDialog
            isOpen={isCheckinDialogOpen}
            onClose={() => setIsCheckinDialogOpen(false)}
            items={currentCheckinItems}
            onComplete={handleCheckinComplete}
          />
        )}

        <Card className="print:shadow-none print:border-0">
          <CardHeader className="print:hidden">
            <CardTitle>Event Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredEventItems.length > 0 ? (
                <>
                  <div className="hidden print:block text-center mb-4">
                    <h2 className="text-xl font-bold">{selectedEvent} Items List</h2>
                    <p className="text-sm text-muted-foreground">
                      Generated on {new Date().toLocaleDateString()}
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Remaining Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Checked By</TableHead>
                        <TableHead>Last Checked At</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEventItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell>{item.event_name}</TableCell>
                          <TableCell>{item.remaining_quantity}</TableCell>
                          <TableCell>
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs",
                              item.is_checked_out ? "bg-green-100 text-green-800" : 
                              item.checkout_items?.some(ci => ci.status === 'checked_in') ? "bg-blue-100 text-blue-800" : 
                              "bg-gray-100 text-gray-800"
                            )}>
                              {item.is_checked_out ? "Checked Out" : 
                               item.checkout_items?.some(ci => ci.status === 'checked_in') ? "Checked In" : 
                               "Available"}
                            </span>
                          </TableCell>
                          <TableCell>{item.last_checked_by || "-"}</TableCell>
                          <TableCell>
                            {item.last_checked_at ? new Date(item.last_checked_at).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground print:hidden">
                  No items found for {selectedEvent}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
    </div>
  )
} 