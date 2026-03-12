"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useOptionalUserProfile } from '@/lib/dashboard-user-profile'
import { Clock, Save, RefreshCw } from 'lucide-react'

export function SettingsManagement() {
  const { toast } = useToast()
  const sharedUserProfile = useOptionalUserProfile()
  const [cutoffHour, setCutoffHour] = useState<number>(11)
  const [cutoffMinute, setCutoffMinute] = useState<number>(59)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (sharedUserProfile?.cutoffTime) {
      setCutoffHour(sharedUserProfile.cutoffTime.hour)
      setCutoffMinute(sharedUserProfile.cutoffTime.minute)
      return
    }

    fetchCutoffTime()
  }, [sharedUserProfile?.cutoffTime])

  const fetchCutoffTime = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/settings?key=cutoffTime')
      const data = await response.json()

      if (data.success && data.data) {
        setCutoffHour(data.data.value.hour || 11)
        setCutoffMinute(data.data.value.minute || 59)
      }
    } catch (error) {
      console.error('Error fetching cutoff time:', error)
      toast({
        title: 'Error',
        description: 'Failed to load cutoff time settings',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const saveCutoffTime = async () => {
    // Validation
    if (cutoffHour < 0 || cutoffHour > 23) {
      toast({
        title: 'Invalid Hour',
        description: 'Hour must be between 0 and 23',
        variant: 'destructive'
      })
      return
    }

    if (cutoffMinute < 0 || cutoffMinute > 59) {
      toast({
        title: 'Invalid Minute',
        description: 'Minute must be between 0 and 59',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'cutoffTime',
          value: {
            hour: cutoffHour,
            minute: cutoffMinute
          },
          description: 'Order cutoff time (day before delivery)'
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: `Cutoff time updated to ${formatTime(cutoffHour, cutoffMinute)}`,
        })
      } else {
        throw new Error(data.error || 'Failed to save')
      }
    } catch (error) {
      console.error('Error saving cutoff time:', error)
      toast({
        title: 'Error',
        description: `Failed to save cutoff time: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const formatTime = (hour: number, minute: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const displayMinute = minute.toString().padStart(2, '0')
    return `${displayHour}:${displayMinute} ${period}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage system-wide settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Order Cutoff Time
          </CardTitle>
          <CardDescription>
            Set the cutoff time for orders. Orders must be placed by this time the day before delivery.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cutoff-hour">Hour (0-23)</Label>
                  <Input
                    id="cutoff-hour"
                    type="number"
                    min="0"
                    max="23"
                    value={cutoffHour}
                    onChange={(e) => setCutoffHour(parseInt(e.target.value) || 0)}
                    placeholder="11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cutoff-minute">Minute (0-59)</Label>
                  <Input
                    id="cutoff-minute"
                    type="number"
                    min="0"
                    max="59"
                    value={cutoffMinute}
                    onChange={(e) => setCutoffMinute(parseInt(e.target.value) || 0)}
                    placeholder="59"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm font-medium text-blue-900">
                  Current Cutoff Time (Toronto Timezone)
                </p>
                <p className="text-2xl font-bold text-blue-700 mt-1">
                  {formatTime(cutoffHour, cutoffMinute)}
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  Orders must be placed by this time the day before delivery
                </p>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-xs text-amber-800">
                  <strong>Example:</strong> If cutoff is set to {formatTime(cutoffHour, cutoffMinute)}, 
                  customers can order for Tuesday delivery until {formatTime(cutoffHour, cutoffMinute)} on Monday.
                  After that time, Tuesday becomes unavailable for ordering.
                </p>
              </div>

              <Button 
                onClick={saveCutoffTime} 
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Cutoff Time
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


