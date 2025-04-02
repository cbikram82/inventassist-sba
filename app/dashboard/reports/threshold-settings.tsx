"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

interface ThresholdSettings {
  low_stock_threshold: number
}

export default function ThresholdSettings() {
  const [settings, setSettings] = useState<ThresholdSettings>({
    low_stock_threshold: 10
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setError(null)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error('Failed to get user session')
      }
      if (!session?.user) {
        console.error('No user session found')
        throw new Error('No user session found')
      }

      console.log('Fetching settings for user:', session.user.id)

      const { data, error } = await supabase
        .from('user_settings')
        .select('low_stock_threshold')
        .eq('user_id', session.user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Settings fetch error:', error)
        throw new Error('Failed to load settings')
      }

      if (data) {
        console.log('Settings loaded:', data)
        setSettings(data)
      } else {
        console.log('No settings found, using default')
        // Create default settings if none exist
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: session.user.id,
            low_stock_threshold: 10
          })

        if (insertError) {
          console.error('Error creating default settings:', insertError)
          throw new Error('Failed to create default settings')
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      setError(error instanceof Error ? error.message : 'Failed to load settings')
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error('Failed to get user session')
      }
      if (!session?.user) {
        console.error('No user session found')
        throw new Error('No user session found')
      }

      console.log('Saving settings for user:', session.user.id)

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: session.user.id,
          low_stock_threshold: settings.low_stock_threshold,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Settings save error:', error)
        throw new Error('Failed to update settings')
      }

      console.log('Settings saved successfully')
      setSuccess('Threshold settings updated successfully')
    } catch (error) {
      console.error('Error updating settings:', error)
      setError(error instanceof Error ? error.message : 'Failed to update settings')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Low Stock Threshold</CardTitle>
        <CardDescription>
          Set the minimum quantity that triggers a low stock alert
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="threshold">Low Stock Threshold</Label>
            <Input
              id="threshold"
              type="number"
              min="0"
              value={settings.low_stock_threshold}
              onChange={(e) => setSettings({ ...settings, low_stock_threshold: parseInt(e.target.value) })}
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Items with quantity below this number will be marked as low stock
            </p>
          </div>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Threshold"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 