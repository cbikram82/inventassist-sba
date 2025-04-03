"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"

interface LowStockSettingsProps {
  onSettingsChange: () => void
}

export function LowStockSettings({ onSettingsChange }: LowStockSettingsProps) {
  const { toast } = useToast()
  const [threshold, setThreshold] = useState<number>(10)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    fetchUser()
  }, [])

  useEffect(() => {
    const fetchSettings = async () => {
      if (!userId) return
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('low_stock_threshold')
          .eq('user_id', userId)
          .single()

        if (error) throw error
        if (data?.low_stock_threshold) {
          setThreshold(data.low_stock_threshold)
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [userId])

  const handleSave = async () => {
    if (!threshold || threshold < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid threshold value",
        variant: "destructive",
      })
      return
    }

    if (!userId) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          low_stock_threshold: threshold
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Low stock threshold updated successfully",
      })

      // Call the callback to refresh data
      if (onSettingsChange) {
        onSettingsChange()
      }
    } catch (error) {
      console.error('Error saving threshold:', error)
      toast({
        title: "Error",
        description: "Failed to save threshold",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="threshold">Low Stock Threshold</Label>
        <Input
          id="threshold"
          type="number"
          min="0"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          placeholder="Enter threshold"
        />
      </div>
      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  )
} 