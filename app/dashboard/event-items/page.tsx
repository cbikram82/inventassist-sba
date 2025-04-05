"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { Loader2, Plus, Package, AlertTriangle } from "lucide-react"
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

interface Item {
  id: string
  name: string
  description: string
  quantity: number
  category: string
  location: string
  person_name?: string
}

interface EventItem {
  id: string
  event_name: string
  item_id: string
  item_name: string
  quantity: number
  created_at: string
}

export default function EventItemsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [eventItems, setEventItems] = useState<EventItem[]>([])
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

      // Fetch event items
      const { data: eventItemsData, error: eventItemsError } = await supabase
        .from('event_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (eventItemsError) throw eventItemsError

      setItems(itemsData || [])
      setEventItems(eventItemsData || [])
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

        <div className="flex justify-between items-center">
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Event" />
            </SelectTrigger>
            <SelectContent>
              {availableEvents.map(event => (
                <SelectItem key={event} value={event}>
                  {event}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Item to Event List</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="item">Item</Label>
                  <Select value={selectedItem} onValueChange={setSelectedItem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} (Available: {item.quantity})
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
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleAddItem}
                >
                  Add Item
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Event Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventItems.map((eventItem) => {
                  const originalItem = items.find(item => item.id === eventItem.item_id)
                  const remaining = originalItem ? originalItem.quantity - eventItem.quantity : 0
                  
                  return (
                    <TableRow key={eventItem.id}>
                      <TableCell>{eventItem.event_name}</TableCell>
                      <TableCell>{eventItem.item_name}</TableCell>
                      <TableCell>{eventItem.quantity}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          remaining <= 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                        )}>
                          {remaining}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteItem(eventItem.id)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 