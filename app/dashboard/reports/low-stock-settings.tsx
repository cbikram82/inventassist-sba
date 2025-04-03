"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"

interface LowStockSettingsProps {
  onSettingsChange?: () => void
}

export function LowStockSettings({ onSettingsChange }: LowStockSettingsProps) {
  const { toast } = useToast()
  const [threshold, setThreshold] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_settings')
        .select('low_stock_threshold')
        .eq('user_id', user.id)
        .single()

      if (error) {
        // If no settings exist, create default settings
        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert([{
            user_id: user.id,
            low_stock_threshold: 10
          }])
          .select()
          .single()

        if (insertError) throw insertError
        setThreshold(newSettings.low_stock_threshold.toString())
      } else {
        setThreshold(data.low_stock_threshold.toString())
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const thresholdValue = parseInt(threshold)
      if (isNaN(thresholdValue) || thresholdValue < 0) {
        toast({
          title: "Error",
          description: "Please enter a valid number",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          low_stock_threshold: thresholdValue
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Settings saved successfully",
      })

      // Call the callback to refresh data
      onSettingsChange?.()
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div>Loading settings...</div>
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="threshold">Low Stock Threshold</Label>
        <div className="flex gap-2">
          <Input
            id="threshold"
            type="number"
            min="0"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="Enter threshold"
            disabled={isSaving}
          />
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Items with quantity below this number will be considered low stock
        </p>
      </div>
    </div>
  )
} 