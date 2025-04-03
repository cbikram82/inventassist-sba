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

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_settings')
        .select('low_stock_threshold')
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // If no settings exist, create default settings
          const { data: newSettings, error: createError } = await supabase
            .from('user_settings')
            .insert([{ user_id: user.id, low_stock_threshold: 10 }])
            .select()
            .single()

          if (createError) throw createError
          setThreshold(newSettings.low_stock_threshold)
        } else {
          throw error
        }
      } else {
        setThreshold(data.low_stock_threshold)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      })
    }
  }

  const handleSave = async () => {
    try {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          low_stock_threshold: threshold
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Low stock threshold updated successfully",
      })

      onSettingsChange()
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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
      <Button onClick={handleSave} disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  )
} 