"use client"

import { useState, useEffect } from "react"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Check,
  AlertCircle,
  Calendar,
  Tag,
  Utensils,
  Package
} from "lucide-react"

// Define types based on the daily-delivery.tsx file
type ComboType = 'A' | 'B'
type ComboItem = {
  id: string
  name: string
  calories: number
  tags: string[]
  typeA: {
    dishes: string[]
    voucherType: 'twoDish'
  }
  typeB: {
    dishes: string[]
    voucherType: 'threeDish'
  }
}

type DayData = {
  date: string
  displayName: string
  week: number
  combos: ComboItem[]
}

export function DailyDeliveryManagement() {
  const { toast } = useToast()
  
  // State for managing the data
  const [days, setDays] = useState<Record<string, DayData>>({})
  // State for filtering days by week
  const [activeWeekFilter, setActiveWeekFilter] = useState<number | null>(null)
  
  // State for managing tags
  const [availableTags, setAvailableTags] = useState<string[]>([])
  
  // State for loading status
  const [isLoading, setIsLoading] = useState(true)
  
  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch days
        const daysResponse = await fetch('/api/days')
        const daysData = await daysResponse.json()
        
        if (daysData.success) {
          const formattedDays: Record<string, DayData> = {}
          
          // Process each day
          for (const day of daysData.data) {
            // Fetch combos for this day
            const combosResponse = await fetch(`/api/days/${day.dayId}/combos`)
            const combosData = await combosResponse.json()
            
            if (combosData.success) {
              // Format combo data to match our component's expected structure
              const formattedCombos = combosData.data.map((combo: any) => ({
                id: combo.comboId,
                name: combo.name,
                calories: combo.calories,
                tags: combo.tags,
                typeA: combo.typeA,
                typeB: combo.typeB
              }))
              
              formattedDays[day.dayId] = {
                date: day.date,
                displayName: day.displayName,
                week: day.week,
                combos: formattedCombos
              }
            }
          }
          
          setDays(formattedDays)
          
          // Set default selected day if available
          if (Object.keys(formattedDays).length > 0) {
            setSelectedDay(Object.keys(formattedDays)[0])
          }
        } else {
          throw new Error(daysData.error || 'Failed to fetch days')
        }
        
        // Fetch tags
        const tagsResponse = await fetch('/api/tags')
        const tagsData = await tagsResponse.json()
        
        if (tagsData.success) {
          setAvailableTags(tagsData.data.map((tag: any) => tag.name))
        } else {
          throw new Error(tagsData.error || 'Failed to fetch tags')
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: 'Error',
          description: `Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [])
  
  // State for editing
  const [selectedDay, setSelectedDay] = useState<string>('monday-w1')
  const [editingCombo, setEditingCombo] = useState<string | null>(null)
  const [editingDay, setEditingDay] = useState<string | null>(null)
  const [newTag, setNewTag] = useState<string>('')
  const [newDish, setNewDish] = useState<string>('')
  const [editingDish, setEditingDish] = useState<{comboId: string, dish: string, type: 'typeA' | 'typeB'} | null>(null)
  const [editedDishName, setEditedDishName] = useState<string>('')
  
  // State for date editing
  const [editedDate, setEditedDate] = useState<string>('')
  const [editedDisplayName, setEditedDisplayName] = useState<string>('')
  const [editedWeek, setEditedWeek] = useState<number>(1)
  
  // Helper function to update a combo locally
  const updateCombo = (dayId: string, comboId: string, updatedCombo: Partial<ComboItem>) => {
    setDays(prevDays => {
      const day = prevDays[dayId]
      if (!day) return prevDays
      
      const updatedCombos = day.combos.map(combo => 
        combo.id === comboId ? { ...combo, ...updatedCombo } : combo
      )
      
      return {
        ...prevDays,
        [dayId]: {
          ...day,
          combos: updatedCombos
        }
      }
    })
  }
  
  // Helper function to save combo changes to backend
  const saveComboChanges = async (dayId: string, comboId: string) => {
    try {
      const day = days[dayId]
      if (!day) return
      
      const combo = day.combos.find(c => c.id === comboId)
      if (!combo) return
      
      const response = await fetch(`/api/combos/${comboId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: combo.name,
          calories: combo.calories,
          tags: combo.tags,
          typeA: combo.typeA,
          typeB: combo.typeB
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Combo updated successfully',
        })
        return true
      } else {
        throw new Error(data.error || 'Failed to update combo')
      }
    } catch (error) {
      console.error('Error updating combo:', error)
      toast({
        title: 'Error',
        description: `Failed to update combo: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      })
      return false
    }
  }
  
  // Helper function to add a tag to a combo
  const addTagToCombo = (dayId: string, comboId: string, tag: string) => {
    setDays(prevDays => {
      const day = prevDays[dayId]
      if (!day) return prevDays
      
      const updatedCombos = day.combos.map(combo => {
        if (combo.id === comboId && !combo.tags.includes(tag)) {
          return {
            ...combo,
            tags: [...combo.tags, tag]
          }
        }
        return combo
      })
      
      return {
        ...prevDays,
        [dayId]: {
          ...day,
          combos: updatedCombos
        }
      }
    })
  }
  
  // Helper function to remove a tag from a combo
  const removeTagFromCombo = (dayId: string, comboId: string, tagToRemove: string) => {
    setDays(prevDays => {
      const day = prevDays[dayId]
      if (!day) return prevDays
      
      const updatedCombos = day.combos.map(combo => {
        if (combo.id === comboId) {
          return {
            ...combo,
            tags: combo.tags.filter(tag => tag !== tagToRemove)
          }
        }
        return combo
      })
      
      return {
        ...prevDays,
        [dayId]: {
          ...day,
          combos: updatedCombos
        }
      }
    })
  }
  
  // Helper function to add a dish to a combo
  const addDishToCombo = (dayId: string, comboId: string, dish: string, type: 'typeA' | 'typeB') => {
    setDays(prevDays => {
      const day = prevDays[dayId]
      if (!day) return prevDays
      
      const updatedCombos = day.combos.map(combo => {
        if (combo.id === comboId && !combo[type].dishes.includes(dish)) {
          return {
            ...combo,
            [type]: {
              ...combo[type],
              dishes: [...combo[type].dishes, dish]
            }
          }
        }
        return combo
      })
      
      return {
        ...prevDays,
        [dayId]: {
          ...day,
          combos: updatedCombos
        }
      }
    })
  }
  
  // Helper function to remove a dish from a combo
  const removeDishFromCombo = (dayId: string, comboId: string, dishToRemove: string, type: 'typeA' | 'typeB') => {
    setDays(prevDays => {
      const day = prevDays[dayId]
      if (!day) return prevDays
      
      const updatedCombos = day.combos.map(combo => {
        if (combo.id === comboId) {
          return {
            ...combo,
            [type]: {
              ...combo[type],
              dishes: combo[type].dishes.filter(dish => dish !== dishToRemove)
            }
          }
        }
        return combo
      })
      
      return {
        ...prevDays,
        [dayId]: {
          ...day,
          combos: updatedCombos
        }
      }
    })
  }
  
  // Helper function to update a dish name
  const updateDishName = async (dayId: string, comboId: string, oldDishName: string, newDishName: string, type: 'typeA' | 'typeB') => {
    if (oldDishName === newDishName) {
      // No change, just cancel editing
      setEditingDish(null);
      return;
    }
    
    try {
      // First update local state for immediate feedback
      setDays(prevDays => {
        const day = prevDays[dayId];
        if (!day) return prevDays;
        
        const updatedCombos = day.combos.map(combo => {
          if (combo.id === comboId) {
            return {
              ...combo,
              [type]: {
                ...combo[type],
                dishes: combo[type].dishes.map(dish => 
                  dish === oldDishName ? newDishName : dish
                )
              }
            };
          }
          return combo;
        });
        
        return {
          ...prevDays,
          [dayId]: {
            ...day,
            combos: updatedCombos
          }
        };
      });
      
      // Then update the backend
      const day = days[dayId];
      if (!day) return;
      
      const combo = day.combos.find(c => c.id === comboId);
      if (!combo) return;
      
      // Create a copy of the combo with the updated dish name
      const updatedCombo = {
        ...combo,
        [type]: {
          ...combo[type],
          dishes: combo[type].dishes.map(dish => 
            dish === oldDishName ? newDishName : dish
          )
        }
      };
      
      // Send the update to the backend
      const response = await fetch(`/api/combos/${comboId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updatedCombo.name,
          calories: updatedCombo.calories,
          tags: updatedCombo.tags,
          typeA: updatedCombo.typeA,
          typeB: updatedCombo.typeB
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Dish updated successfully',
        });
      } else {
        throw new Error(data.error || 'Failed to update dish');
      }
    } catch (error) {
      console.error('Error updating dish:', error);
      toast({
        title: 'Error',
        description: `Failed to update dish: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      // Reset editing state
      setEditingDish(null);
      setEditedDishName('');
    }
  }
  
  // Helper function to add a new tag to the available tags
  const addNewTag = async () => {
    if (newTag && !availableTags.includes(newTag)) {
      try {
        // Create tag via API
        const response = await fetch('/api/tags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newTag
          }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Update local state
          setAvailableTags([...availableTags, newTag]);
          setNewTag('');
          
          toast({
            title: 'Success',
            description: 'Tag created successfully',
          });
        } else {
          throw new Error(data.error || 'Failed to create tag');
        }
      } catch (error) {
        console.error('Error creating tag:', error);
        toast({
          title: 'Error',
          description: `Failed to create tag: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: 'destructive'
        });
      }
    }
  }
  
  // Helper function to update a day
  const updateDay = async (dayId: string, updatedDay: Partial<DayData>) => {
    try {
      const response = await fetch(`/api/days/${dayId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: updatedDay.date,
          displayName: updatedDay.displayName,
          week: updatedDay.week
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Update local state
        setDays(prevDays => {
          const day = prevDays[dayId]
          if (!day) return prevDays
          
          return {
            ...prevDays,
            [dayId]: {
              ...day,
              ...updatedDay
            }
          }
        })
        
        toast({
          title: 'Success',
          description: 'Day updated successfully',
        })
      } else {
        throw new Error(data.error || 'Failed to update day')
      }
    } catch (error) {
      console.error('Error updating day:', error)
      toast({
        title: 'Error',
        description: `Failed to update day: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      })
    }
  }
  
  // Start editing a day
  const startEditingDay = (dayId: string) => {
    const day = days[dayId]
    if (day) {
      setEditingDay(dayId)
      setEditedDate(day.date)
      setEditedDisplayName(day.displayName)
      setEditedWeek(day.week)
    }
  }
  
  // Save day edits
  const saveEditedDay = async () => {
    if (editingDay) {
      await updateDay(editingDay, {
        date: editedDate,
        displayName: editedDisplayName,
        week: editedWeek
      })
      setEditingDay(null)
    }
  }
  
  // Cancel day editing
  const cancelEditingDay = () => {
    setEditingDay(null)
  }
  
  // Function to initialize Next Week days based on This Week
  const initializeNextWeek = async () => {
    try {
      // Get all days from week 1
      const week1Days = Object.entries(days).filter(([_, day]) => day.week === 1);
      
      if (week1Days.length === 0) {
        toast({
          title: "Error",
          description: "No days found for This Week to duplicate",
          variant: "destructive"
        });
        return;
      }
      
      // Check if there are already days in week 2
      const existingWeek2Days = Object.entries(days).filter(([_, day]) => day.week === 2);
      if (existingWeek2Days.length > 0) {
        if (!confirm("Next Week already has some days. Do you want to add more days from This Week?")) {
          return;
        }
      } else {
        // Show confirmation dialog
        if (!confirm("This will create Next Week days based on This Week. Continue?")) {
          return;
        }
      }
      
      // Track created days to update state at the end
      const createdDays: Record<string, DayData> = {};
      
      // Process each day from week 1
      for (const [dayId, day] of week1Days) {
        // Skip if a day with the same displayName already exists in week 2
        const existingDay = Object.values(days).find(d => 
          d.week === 2 && d.displayName === day.displayName
        );
        
        if (existingDay) {
          console.log(`Skipping ${day.displayName} as it already exists in Next Week`);
          continue;
        }
        
        // Create a new day ID for week 2
        const newDayId = `${day.displayName}-w2-${Date.now()}`;
        
        // Calculate date for next week (add 7 days)
        const dateMatch = day.date.match(/(\w+)\s+(\d+)/);
        let nextWeekDate = day.date;
        
        if (dateMatch && dateMatch.length >= 3) {
          const month = dateMatch[1];
          const dayNum = parseInt(dateMatch[2], 10);
          nextWeekDate = `${month} ${dayNum + 7}`;
        }
        
        // Create new day via API
        const dayResponse = await fetch('/api/days', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dayId: newDayId,
            date: nextWeekDate,
            displayName: day.displayName,
            week: 2,
            isActive: true
          }),
        });
        
        const dayData = await dayResponse.json();
        
        if (!dayData.success) {
          throw new Error(dayData.error || 'Failed to create day');
        }
        
        // Create combos for the new day
        for (const combo of day.combos) {
          const newComboId = `${newDayId}-combo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          
          const comboResponse = await fetch('/api/combos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              comboId: newComboId,
              dayId: newDayId,
              name: combo.name,
              calories: combo.calories,
              tags: combo.tags,
              typeA: combo.typeA,
              typeB: combo.typeB
            }),
          });
          
          const comboData = await comboResponse.json();
          
          if (!comboData.success) {
            throw new Error(comboData.error || 'Failed to create combo');
          }
        }
        
        // Add to created days
        createdDays[newDayId] = {
          date: nextWeekDate,
          displayName: day.displayName,
          week: 2,
          combos: day.combos.map(combo => ({
            ...combo,
            id: `${newDayId}-combo-${Date.now()}-${Math.floor(Math.random() * 1000)}`
          }))
        };
      }
      
      // Refresh data to show new days
      const daysResponse = await fetch('/api/days');
      const daysData = await daysResponse.json();
      
      if (daysData.success) {
        const formattedDays: Record<string, DayData> = {};
        
        // Process each day
        for (const day of daysData.data) {
          // Fetch combos for this day
          const combosResponse = await fetch(`/api/days/${day.dayId}/combos`);
          const combosData = await combosResponse.json();
          
          if (combosData.success) {
            // Format combo data to match our component's expected structure
            const formattedCombos = combosData.data.map((combo: any) => ({
              id: combo.comboId,
              name: combo.name,
              calories: combo.calories,
              tags: combo.tags,
              typeA: combo.typeA,
              typeB: combo.typeB
            }));
            
            formattedDays[day.dayId] = {
              date: day.date,
              displayName: day.displayName,
              week: day.week,
              combos: formattedCombos
            };
          }
        }
        
        setDays(formattedDays);
        
        // Switch to Next Week view
        setActiveWeekFilter(2);
        
        toast({
          title: "Success",
          description: `Created ${Object.keys(createdDays).length} days for Next Week (6 days total, no Saturday)`,
        });
      }
    } catch (error) {
      console.error('Error initializing next week:', error);
      toast({
        title: "Error",
        description: `Failed to initialize Next Week: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  }

  return (
    <div className="flex-1 space-y-6">
      {isLoading ? (
        <div className="flex justify-center items-center h-[300px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading data...</p>
          </div>
        </div>
      ) : (
      <Tabs defaultValue="dates" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dates" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Dates</span>
          </TabsTrigger>
          <TabsTrigger value="combos" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>Combos & Dishes</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Dates Management Tab */}
        <TabsContent value="dates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Date Management</CardTitle>
              <CardDescription>Manage delivery dates and week assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-medium">Current Delivery Schedule</h3>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant={activeWeekFilter === null ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setActiveWeekFilter(null)}
                      >
                        All
                      </Button>
                      <Button 
                        variant={activeWeekFilter === 1 ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setActiveWeekFilter(1)}
                      >
                        This Week
                      </Button>
                      <Button 
                        variant={activeWeekFilter === 2 ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setActiveWeekFilter(2)}
                      >
                        Next Week
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={async () => {
                        try {
                          // Generate a new unique day ID
                          const newDayId = `new-day-${Date.now()}`;
                          
                          // Create new day via API
                          const dayResponse = await fetch('/api/days', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              dayId: newDayId,
                              date: 'New Date',
                              displayName: 'new-day',
                              week: 1,
                              isActive: true
                            }),
                          });
                          
                          const dayData = await dayResponse.json();
                          
                          if (!dayData.success) {
                            throw new Error(dayData.error || 'Failed to create day');
                          }
                          
                          // Create default combo for the new day
                          const comboId = `${newDayId}-combo1`;
                          const comboResponse = await fetch('/api/combos', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              comboId,
                              dayId: newDayId,
                              name: '套餐 1',
                              calories: 650,
                              tags: ["Fresh", "Healthy"],
                              typeA: {
                                dishes: ["Dish 1", "Dish 2", "Dish 3"],
                                voucherType: 'twoDish'
                              },
                              typeB: {
                                dishes: ["Dish 1", "Dish 2", "Dish 3", "Dish 4", "Dish 5"],
                                voucherType: 'threeDish'
                              }
                            }),
                          });
                          
                          const comboData = await comboResponse.json();
                          
                          if (!comboData.success) {
                            throw new Error(comboData.error || 'Failed to create combo');
                          }
                          
                          // Update local state
                          setDays(prevDays => ({
                            ...prevDays,
                            [newDayId]: {
                              date: 'New Date',
                              displayName: 'new-day',
                              week: 1,
                              combos: [{
                                id: comboId,
                                name: '套餐 1',
                                calories: 650,
                                tags: ["Fresh", "Healthy"],
                                typeA: {
                                  dishes: ["Dish 1", "Dish 2", "Dish 3"],
                                  voucherType: 'twoDish'
                                },
                                typeB: {
                                  dishes: ["Dish 1", "Dish 2", "Dish 3", "Dish 4", "Dish 5"],
                                  voucherType: 'threeDish'
                                }
                              }]
                            }
                          }));
                          
                          // Start editing the new day immediately
                          startEditingDay(newDayId);
                          
                          toast({
                            title: 'Success',
                            description: 'New day created successfully',
                          });
                        } catch (error) {
                          console.error('Error creating day:', error);
                          toast({
                            title: 'Error',
                            description: `Failed to create day: ${error instanceof Error ? error.message : 'Unknown error'}`,
                            variant: 'destructive'
                          });
                        }
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Day
                    </Button>
                  </div>
                </div>
                
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Day</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Week</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(days)
                        .filter(([_, day]) => activeWeekFilter === null || day.week === activeWeekFilter)
                        .map(([dayId, day]) => (
                        <TableRow key={dayId}>
                          {editingDay === dayId ? (
                            <>
                              <TableCell>
                                <Input
                                  value={editedDisplayName}
                                  onChange={(e) => setEditedDisplayName(e.target.value)}
                                  className="w-full"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={editedDate}
                                  onChange={(e) => setEditedDate(e.target.value)}
                                  className="w-full"
                                  placeholder="e.g. Sep 1"
                                />
                              </TableCell>
                              <TableCell>
                                <Select value={editedWeek.toString()} onValueChange={(value) => setEditedWeek(parseInt(value))}>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select week" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">This Week</SelectItem>
                                    <SelectItem value="2">Next Week</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                                  Editing
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={saveEditedDay} className="text-green-600">
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={cancelEditingDay} className="text-red-500">
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="font-medium capitalize">{day.displayName}</TableCell>
                              <TableCell>{day.date}</TableCell>
                              <TableCell>{day.week === 1 ? 'This Week' : 'Next Week'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                                  Active
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => startEditingDay(dayId)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-red-500"
                                  onClick={async () => {
                                    // Show confirmation dialog
                                    if (confirm(`Are you sure you want to delete ${day.displayName} (${day.date})?`)) {
                                      try {
                                        // Delete day via API
                                        const response = await fetch(`/api/days/${dayId}`, {
                                          method: 'DELETE',
                                        });
                                        
                                        const data = await response.json();
                                        
                                        if (data.success) {
                                          // Update local state
                                          setDays(prevDays => {
                                            const newDays = { ...prevDays };
                                            delete newDays[dayId];
                                            return newDays;
                                          });
                                          
                                          toast({
                                            title: 'Success',
                                            description: 'Day deleted successfully',
                                          });
                                        } else {
                                          throw new Error(data.error || 'Failed to delete day');
                                        }
                                      } catch (error) {
                                        console.error('Error deleting day:', error);
                                        toast({
                                          title: 'Error',
                                          description: `Failed to delete day: ${error instanceof Error ? error.message : 'Unknown error'}`,
                                          variant: 'destructive'
                                        });
                                      }
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Combos & Dishes Management Tab */}
        <TabsContent value="combos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Combo & Dish Management</CardTitle>
              <CardDescription>Manage combo meals and their dishes for each day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <Label htmlFor="day-select" className="text-base font-medium">Select Day</Label>
                    <Select value={selectedDay} onValueChange={setSelectedDay}>
                      <SelectTrigger id="day-select" className="w-[250px] mt-1">
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        {Object.entries(days)
                          .sort(([_, a], [__, b]) => (a.week === b.week ? 0 : a.week < b.week ? -1 : 1))
                          .map(([dayId, day]) => (
                            <SelectItem key={dayId} value={dayId} className="py-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">{day.displayName}</span>
                                <Badge variant="outline" className={day.week === 1 ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}>
                                  {day.week === 1 ? 'This Week' : 'Next Week'}
                                </Badge>
                                <span className="text-muted-foreground text-xs">{day.date}</span>
                              </div>
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={async () => {
                      try {
                        if (!selectedDay) {
                          toast({
                            title: 'Error',
                            description: 'Please select a day first',
                            variant: 'destructive'
                          });
                          return;
                        }
                        
                        // Generate a new unique combo ID
                        const newComboId = `${selectedDay}-combo-${Date.now()}`;
                        
                        // Create new combo via API
                        const response = await fetch('/api/combos', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            comboId: newComboId,
                            dayId: selectedDay,
                            name: '新套餐',
                            calories: 650,
                            tags: ["New"],
                            typeA: {
                              dishes: ["Dish 1", "Dish 2"],
                              voucherType: 'twoDish'
                            },
                            typeB: {
                              dishes: ["Dish 1", "Dish 2", "Dish 3"],
                              voucherType: 'threeDish'
                            }
                          }),
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                          // Update local state
                          setDays(prevDays => {
                            const day = prevDays[selectedDay];
                            if (!day) return prevDays;
                            
                            return {
                              ...prevDays,
                              [selectedDay]: {
                                ...day,
                                combos: [
                                  ...day.combos,
                                  {
                                    id: newComboId,
                                    name: '新套餐',
                                    calories: 650,
                                    tags: ["New"],
                                    typeA: {
                                      dishes: ["Dish 1", "Dish 2"],
                                      voucherType: 'twoDish'
                                    },
                                    typeB: {
                                      dishes: ["Dish 1", "Dish 2", "Dish 3"],
                                      voucherType: 'threeDish'
                                    }
                                  }
                                ]
                              }
                            };
                          });
                          
                          toast({
                            title: 'Success',
                            description: 'New combo created successfully',
                          });
                          
                          // Start editing the new combo immediately
                          setEditingCombo(newComboId);
                        } else {
                          throw new Error(data.error || 'Failed to create combo');
                        }
                      } catch (error) {
                        console.error('Error creating combo:', error);
                        toast({
                          title: 'Error',
                          description: `Failed to create combo: ${error instanceof Error ? error.message : 'Unknown error'}`,
                          variant: 'destructive'
                        });
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Combo
                  </Button>
                </div>
                
                {days[selectedDay]?.combos.map((combo) => (
                  <Card key={combo.id} className="border">
                    <CardHeader className="pb-2 bg-muted/50">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">{combo.name}</CardTitle>
                        <div className="flex gap-2">
                          {combo.id === editingCombo ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-green-600"
                                onClick={async () => {
                                  const success = await saveComboChanges(selectedDay, combo.id);
                                  if (success) {
                                    setEditingCombo(null);
                                  }
                                }}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setEditingCombo(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setEditingCombo(combo.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-500"
                                onClick={async () => {
                                  // Show confirmation dialog
                                  if (confirm(`Are you sure you want to delete ${combo.name}?`)) {
                                    try {
                                      // Delete combo via API
                                      const response = await fetch(`/api/combos/${combo.id}`, {
                                        method: 'DELETE',
                                      });
                                      
                                      const data = await response.json();
                                      
                                      if (data.success) {
                                        // Update local state
                                        setDays(prevDays => {
                                          const day = prevDays[selectedDay];
                                          if (!day) return prevDays;
                                          
                                          return {
                                            ...prevDays,
                                            [selectedDay]: {
                                              ...day,
                                              combos: day.combos.filter(c => c.id !== combo.id)
                                            }
                                          };
                                        });
                                        
                                        toast({
                                          title: 'Success',
                                          description: 'Combo deleted successfully',
                                        });
                                      } else {
                                        throw new Error(data.error || 'Failed to delete combo');
                                      }
                                    } catch (error) {
                                      console.error('Error deleting combo:', error);
                                      toast({
                                        title: 'Error',
                                        description: `Failed to delete combo: ${error instanceof Error ? error.message : 'Unknown error'}`,
                                        variant: 'destructive'
                                      });
                                    }
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{combo.calories} KCAL</span>
                        <div className="flex gap-1">
                          {combo.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    
                    {combo.id === editingCombo ? (
                      <CardContent className="pt-4">
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`combo-name-${combo.id}`}>Combo Name</Label>
                              <Input 
                                id={`combo-name-${combo.id}`} 
                                value={combo.name} 
                                onChange={(e) => updateCombo(selectedDay, combo.id, { name: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`combo-calories-${combo.id}`}>Calories</Label>
                              <Input 
                                id={`combo-calories-${combo.id}`} 
                                type="number" 
                                value={combo.calories} 
                                onChange={(e) => updateCombo(selectedDay, combo.id, { calories: parseInt(e.target.value) })}
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label>Tags</Label>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs"
                                onClick={() => {
                                  if (newTag && !availableTags.includes(newTag)) {
                                    setAvailableTags([...availableTags, newTag]);
                                    addTagToCombo(selectedDay, combo.id, newTag);
                                    setNewTag('');
                                  }
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Create New Tag
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {combo.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                  {tag}
                                  <button 
                                    onClick={() => removeTagFromCombo(selectedDay, combo.id, tag)}
                                    className="ml-1 text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                              <div className="flex gap-2 items-center mt-1">
                                <Input
                                  placeholder="New tag..."
                                  value={newTag}
                                  onChange={(e) => setNewTag(e.target.value)}
                                  className="h-8 w-[120px] text-sm"
                                />
                                <Select onValueChange={(tag) => {
                                  addTagToCombo(selectedDay, combo.id, tag)
                                }}>
                                  <SelectTrigger className="w-[150px] h-8 text-sm">
                                    <SelectValue placeholder="Add existing tag" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableTags
                                      .filter(tag => !combo.tags.includes(tag))
                                      .map(tag => (
                                        <SelectItem key={tag} value={tag}>
                                          {tag}
                                        </SelectItem>
                                      ))
                                    }
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div className="mt-4 pt-3 border-t">
                              <Label className="text-sm text-muted-foreground mb-2 block">Available Tags</Label>
                              <div className="flex flex-wrap gap-2">
                                {availableTags.map((tag) => (
                                  <div key={tag} className="flex items-center border rounded-md p-1">
                                    <Badge variant="secondary" className="mr-1">{tag}</Badge>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5 text-red-500"
                                      onClick={async () => {
                                        try {
                                          // Find tag ID by name
                                          const tagsResponse = await fetch('/api/tags');
                                          const tagsData = await tagsResponse.json();
                                          
                                          if (!tagsData.success) {
                                            throw new Error(tagsData.error || 'Failed to fetch tags');
                                          }
                                          
                                          const tagObj = tagsData.data.find((t: any) => t.name === tag);
                                          
                                          if (!tagObj) {
                                            throw new Error('Tag not found');
                                          }
                                          
                                          // Delete tag via API
                                          const response = await fetch(`/api/tags/${tagObj._id}`, {
                                            method: 'DELETE',
                                          });
                                          
                                          const data = await response.json();
                                          
                                          if (data.success) {
                                            // Update local state
                                            setAvailableTags(availableTags.filter(t => t !== tag));
                                            
                                            toast({
                                              title: 'Success',
                                              description: 'Tag deleted successfully',
                                            });
                                          } else {
                                            throw new Error(data.error || 'Failed to delete tag');
                                          }
                                        } catch (error) {
                                          console.error('Error deleting tag:', error);
                                          toast({
                                            title: 'Error',
                                            description: `Failed to delete tag: ${error instanceof Error ? error.message : 'Unknown error'}`,
                                            variant: 'destructive'
                                          });
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-6 border-t pt-4">
                            <div>
                              <h3 className="text-lg font-medium mb-4">Dish Management</h3>
                              
                              <div className="bg-blue-50 p-4 rounded-md mb-6">
                                <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                                  <Package className="h-4 w-4 mr-2" />
                                  2-Dish Voucher Option
                                </h4>
                                <p className="text-sm text-blue-600 mb-4">These dishes are included in the 2-dish voucher option.</p>
                                
                                <div className="space-y-2">
                                  {combo.typeA.dishes.map((dish, index) => (
                                    <div key={dish} className="flex items-center justify-between bg-white p-3 rounded-md border border-blue-100">
                                      <div className="flex items-center flex-grow">
                                        <span className="font-medium text-blue-900">{index + 1}.</span>
                                        {editingDish && editingDish.comboId === combo.id && editingDish.dish === dish && editingDish.type === 'typeA' ? (
                                          <div className="ml-2 flex-grow flex gap-2">
                                            <Input
                                              value={editedDishName}
                                              onChange={(e) => setEditedDishName(e.target.value)}
                                              className="h-8"
                                              autoFocus
                                            />
                                            <div className="flex gap-1">
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 text-green-600"
                                                onClick={() => updateDishName(selectedDay, combo.id, dish, editedDishName, 'typeA')}
                                              >
                                                <Check className="h-4 w-4" />
                                              </Button>
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8"
                                                onClick={() => {
                                                  setEditingDish(null);
                                                  setEditedDishName('');
                                                }}
                                              >
                                                <X className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="ml-2">{dish}</span>
                                        )}
                                      </div>
                                      <div className="flex gap-1">
                                        {!(editingDish && editingDish.comboId === combo.id && editingDish.dish === dish) && (
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => {
                                              setEditingDish({ comboId: combo.id, dish, type: 'typeA' });
                                              setEditedDishName(dish);
                                            }}
                                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        )}
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => removeDishFromCombo(selectedDay, combo.id, dish, 'typeA')}
                                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="flex gap-2 mt-4">
                                    <Input 
                                      placeholder="Add new dish to 2-dish option" 
                                      value={newDish} 
                                      onChange={(e) => setNewDish(e.target.value)} 
                                      className="border-blue-200 focus:border-blue-400"
                                    />
                                    <Button 
                                      variant="outline" 
                                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                      onClick={() => {
                                        if (newDish) {
                                          addDishToCombo(selectedDay, combo.id, newDish, 'typeA')
                                          setNewDish('')
                                        }
                                      }}
                                    >
                                      Add
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-green-50 p-4 rounded-md">
                                <h4 className="font-medium text-green-800 mb-2 flex items-center">
                                  <Package className="h-4 w-4 mr-2" />
                                  3-Dish Voucher Option
                                </h4>
                                <p className="text-sm text-green-600 mb-4">These dishes are included in the 3-dish voucher option.</p>
                                
                                <div className="space-y-2">
                                  {combo.typeB.dishes.map((dish, index) => (
                                    <div key={dish} className="flex items-center justify-between bg-white p-3 rounded-md border border-green-100">
                                      <div className="flex items-center flex-grow">
                                        <span className="font-medium text-green-900">{index + 1}.</span>
                                        {editingDish && editingDish.comboId === combo.id && editingDish.dish === dish && editingDish.type === 'typeB' ? (
                                          <div className="ml-2 flex-grow flex gap-2">
                                            <Input
                                              value={editedDishName}
                                              onChange={(e) => setEditedDishName(e.target.value)}
                                              className="h-8"
                                              autoFocus
                                            />
                                            <div className="flex gap-1">
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 text-green-600"
                                                onClick={() => updateDishName(selectedDay, combo.id, dish, editedDishName, 'typeB')}
                                              >
                                                <Check className="h-4 w-4" />
                                              </Button>
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8"
                                                onClick={() => {
                                                  setEditingDish(null);
                                                  setEditedDishName('');
                                                }}
                                              >
                                                <X className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            <span className="ml-2">{dish}</span>
                                            {combo.typeA.dishes.includes(dish) && (
                                              <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-600 border-green-200">
                                                Also in 2-dish option
                                              </Badge>
                                            )}
                                          </>
                                        )}
                                      </div>
                                      <div className="flex gap-1">
                                        {!(editingDish && editingDish.comboId === combo.id && editingDish.dish === dish) && (
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => {
                                              setEditingDish({ comboId: combo.id, dish, type: 'typeB' });
                                              setEditedDishName(dish);
                                            }}
                                            className="text-green-500 hover:text-green-700 hover:bg-green-50"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        )}
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => removeDishFromCombo(selectedDay, combo.id, dish, 'typeB')}
                                          className="text-green-500 hover:text-green-700 hover:bg-green-50"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="flex gap-2 mt-4">
                                    <Input 
                                      placeholder="Add new dish to 3-dish option" 
                                      value={newDish} 
                                      onChange={(e) => setNewDish(e.target.value)} 
                                      className="border-green-200 focus:border-green-400"
                                    />
                                    <Button 
                                      variant="outline" 
                                      className="border-green-200 text-green-600 hover:bg-green-50"
                                      onClick={() => {
                                        if (newDish) {
                                          addDishToCombo(selectedDay, combo.id, newDish, 'typeB')
                                          setNewDish('')
                                        }
                                      }}
                                    >
                                      Add
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    ) : (
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium mb-2 text-blue-700">2-Dish Option</h4>
                            <div className="space-y-1">
                              {combo.typeA.dishes.map((dish, index) => (
                                <div key={dish} className="text-sm py-1 px-2 rounded bg-blue-50">
                                  {index + 1}. {dish}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2 text-green-700">3-Dish Option</h4>
                            <div className="space-y-1">
                              {combo.typeB.dishes.map((dish, index) => (
                                <div key={dish} className="text-sm py-1 px-2 rounded bg-green-50">
                                  {index + 1}. {dish}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
      </Tabs>
      )}
    </div>
  )
}
