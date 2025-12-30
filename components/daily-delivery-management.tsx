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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  Package,
  RefreshCcw,
  ChevronDown,
  Loader2,
  History
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
  const [isRollingForward, setIsRollingForward] = useState(false)
  
  // State for history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<any>(null)
  const [selectedWeekRange, setSelectedWeekRange] = useState<string | null>(null)
  
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
  
  // State for day creation modal
  const [showDayCreationModal, setShowDayCreationModal] = useState<boolean>(false)
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string | null>(null)
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(1)
  const [startDate, setStartDate] = useState<string>('')
  const [calculatedDates, setCalculatedDates] = useState<Record<string, string>>({
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    sunday: ''
  })
  
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
  
  // Function to sync dishes from typeA (2-dish) to typeB (3-dish)
  const syncDishesToTypeB = (dayId: string, comboId: string) => {
    try {
      // Get the current combo
      const day = days[dayId];
      if (!day) return;
      
      const combo = day.combos.find(c => c.id === comboId);
      if (!combo) return;
      
      // Create a new typeB dishes array that starts with all typeA dishes
      // and keeps any existing typeB dishes that aren't in typeA
      const newTypeBDishes = [...combo.typeA.dishes];
      
      // Add any dishes from typeB that aren't in typeA
      combo.typeB.dishes.forEach(dish => {
        if (!newTypeBDishes.includes(dish)) {
          newTypeBDishes.push(dish);
        }
      });
      
      // Update the combo in local state
      setDays(prevDays => {
        const updatedCombos = day.combos.map(c => {
          if (c.id === comboId) {
            return {
              ...c,
              typeB: {
                ...c.typeB,
                dishes: newTypeBDishes
              }
            };
          }
          return c;
        });
        
        return {
          ...prevDays,
          [dayId]: {
            ...day,
            combos: updatedCombos
          }
        };
      });
      
      // Save changes to backend
      saveComboChanges(dayId, comboId);
      
      toast({
        title: 'Success',
        description: 'Synced 2-dish items to 3-dish option',
      });
    } catch (error) {
      console.error('Error syncing dishes:', error);
      toast({
        title: 'Error',
        description: `Failed to sync dishes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    }
  };
  
  // Function to fetch history data
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/day-history?limit=100');
      const data = await response.json();
      
      if (data.success) {
        setHistoryData(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch history');
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast({
        title: 'Error',
        description: `Failed to load history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };
  
  // Helper function to parse date string into a Date object
  const parseDateString = (dateStr: string): Date | null => {
    const dateMatch = dateStr.match(/(\w+)\s+(\d+)/);
    if (dateMatch && dateMatch.length >= 3) {
      const month = dateMatch[1]; // e.g., "Dec"
      const dayNum = parseInt(dateMatch[2], 10); // e.g., 15
      
      // Map month abbreviation to month number (0-based)
      const monthMap: Record<string, number> = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      if (monthMap[month] !== undefined) {
        // Current year
        const currentYear = new Date().getFullYear();
        return new Date(currentYear, monthMap[month], dayNum);
      }
    }
    return null;
  };
  
  // Helper function to format a Date object to "MMM D" format (e.g., "Dec 15")
  const formatDateToString = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };
  
  // Helper function to calculate next week's date
  const calculateNextWeekDate = (dateStr: string): string => {
    // Parse the date string into a Date object
    const date = parseDateString(dateStr);
    if (!date) return dateStr;
    
    // Add 7 days
    date.setDate(date.getDate() + 7);
    
    // Format back to "MMM D" format
    return formatDateToString(date);
  };
  
  // Helper function to calculate dates for all days of the week based on a starting day and date
  const calculateDatesForWeek = (startDay: string, startDateStr: string): Record<string, string> => {
    const result: Record<string, string> = {
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      sunday: ''
    };
    
    // Parse the start date
    const startDate = parseDateString(startDateStr);
    if (!startDate) return result;
    
    // Map day names to their position in a standard week (Monday = 0, Sunday = 6)
    const dayNameToWeekPosition: Record<string, number> = {
      'monday': 0,
      'tuesday': 1,
      'wednesday': 2,
      'thursday': 3,
      'friday': 4,
      'sunday': 6  // Sunday is at the end of the week
    };
    
    // Get the week position for the start day
    const startDayPosition = dayNameToWeekPosition[startDay.toLowerCase()];
    if (startDayPosition === undefined) return result;
    
    // Calculate dates for each day we need
    for (const dayName of Object.keys(result)) {
      const targetDayPosition = dayNameToWeekPosition[dayName];
      if (targetDayPosition === undefined) continue;
      
      // Calculate the difference in days from the start day
      const dayDiff = targetDayPosition - startDayPosition;
      
      // Create a new date and add the difference
      const date = new Date(startDate);
      date.setDate(date.getDate() + dayDiff);
      result[dayName] = formatDateToString(date);
    }
    
    return result;
  };
  
  // Function to roll forward the week - making Next Week into This Week and updating This Week with Next Week's content
  const rollForwardWeek = async () => {
    try {
      // Show confirmation dialog
      if (!confirm("This will update This Week with Next Week's content and create a new Next Week. Continue?")) {
        return;
      }

      // Set loading state
      setIsRollingForward(true);

      // Get all days from week 2 (Next Week) and week 1 (This Week)
      const week2Days = Object.entries(days).filter(([_, day]) => day.week === 2);
      const week1Days = Object.entries(days).filter(([dayId, day]) => day.week === 1);
      
      if (week2Days.length === 0) {
        toast({
          title: "Error",
          description: "No days found in Next Week to roll forward",
          variant: "destructive"
        });
        setIsRollingForward(false);
        return;
      }

      // 0. Archive old This Week data before replacing it
      console.log('Archiving old This Week data...');
      for (const [thisDayId, thisDay] of week1Days) {
        try {
          // Fetch combos for this day
          const combosResponse = await fetch(`/api/days/${thisDayId}/combos`);
          const combosData = await combosResponse.json();
          
          if (combosData.success) {
            // Create history entry
            const historyId = `history-${thisDayId}-${Date.now()}`;
            await fetch('/api/day-history', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                historyId,
                originalDayId: thisDayId,
                displayName: thisDay.displayName,
                date: thisDay.date,
                week: thisDay.week,
                archivedReason: 'rolled_forward',
                combos: combosData.data.map((combo: any) => ({
                  comboId: combo.comboId,
                  name: combo.name,
                  calories: combo.calories,
                  tags: combo.tags,
                  typeA: combo.typeA,
                  typeB: combo.typeB
                }))
              }),
            });
            console.log(`Archived: ${thisDay.displayName} ${thisDay.date}`);
          }
        } catch (error) {
          console.error(`Error archiving ${thisDay.displayName}:`, error);
          // Continue with roll forward even if archiving fails
        }
      }

      // 1. Update This Week days with Next Week's content
      for (const [nextDayId, nextDay] of week2Days) {
        // Find matching day in This Week by displayName (e.g., "monday", "tuesday")
        const matchingThisWeekDay = week1Days.find(([_, day]) => day.displayName === nextDay.displayName);
        
        if (matchingThisWeekDay) {
          const [thisDayId, thisDay] = matchingThisWeekDay;
          
          // 1.1 Update This Week day with Next Week's date
          await fetch(`/api/days/${thisDayId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              date: nextDay.date,
              displayName: nextDay.displayName,
              week: 1 // Keep it as week 1
            }),
          });
          
          // 1.2 Get combos for both days
          const thisWeekCombosResponse = await fetch(`/api/days/${thisDayId}/combos`);
          const thisWeekCombosData = await thisWeekCombosResponse.json();
          
          const nextWeekCombosResponse = await fetch(`/api/days/${nextDayId}/combos`);
          const nextWeekCombosData = await nextWeekCombosResponse.json();
          
          if (thisWeekCombosData.success && nextWeekCombosData.success) {
            // 1.3 Delete existing combos for This Week day
            for (const combo of thisWeekCombosData.data) {
              await fetch(`/api/combos/${combo.comboId}`, {
                method: 'DELETE',
              });
            }
            
            // 1.4 Create new combos for This Week day based on Next Week's combos
            for (const combo of nextWeekCombosData.data) {
              const newComboId = `${thisDayId}-combo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              
              await fetch('/api/combos', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  comboId: newComboId,
                  dayId: thisDayId,
                  name: combo.name,
                  calories: combo.calories,
                  tags: combo.tags,
                  typeA: combo.typeA,
                  typeB: combo.typeB
                }),
              });
            }
          }
        } else {
          // If no matching day exists in This Week, create a new one
          const newThisDayId = `${nextDay.displayName}-w1-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          
          // Create new This Week day
          await fetch('/api/days', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              dayId: newThisDayId,
              date: nextDay.date,
              displayName: nextDay.displayName,
              week: 1,
              isActive: true
            }),
          });
          
          // Copy combos from Next Week day to new This Week day
          const nextWeekCombosResponse = await fetch(`/api/days/${nextDayId}/combos`);
          const nextWeekCombosData = await nextWeekCombosResponse.json();
          
          if (nextWeekCombosData.success) {
            for (const combo of nextWeekCombosData.data) {
              const newComboId = `${newThisDayId}-combo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              
              await fetch('/api/combos', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  comboId: newComboId,
                  dayId: newThisDayId,
                  name: combo.name,
                  calories: combo.calories,
                  tags: combo.tags,
                  typeA: combo.typeA,
                  typeB: combo.typeB
                }),
              });
            }
          }
        }
      }

      // 2. Update Next Week days with new dates and replace combos with fresh templates
      for (const [nextDayId, nextDay] of week2Days) {
        // Calculate new date for Next Week (current date + 7 days)
        const newNextWeekDate = calculateNextWeekDate(nextDay.date);
        
        // Update Next Week day with new date
        await fetch(`/api/days/${nextDayId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: newNextWeekDate,
            displayName: nextDay.displayName,
            week: 2 // Keep it as week 2
          }),
        });
        
        // 2.1 Delete old combos for this Next Week day
        const oldCombosResponse = await fetch(`/api/days/${nextDayId}/combos`);
        const oldCombosData = await oldCombosResponse.json();
        
        if (oldCombosData.success) {
          for (const combo of oldCombosData.data) {
            await fetch(`/api/combos/${combo.comboId}`, {
              method: 'DELETE',
            });
          }
        }
        
        // 2.2 Create fresh template combos (套餐 1 and 套餐 2)
        const templateCombos = [
          {
            name: '套餐 1',
            calories: 0,
            tags: [],
            typeA: {
              dishes: ['Dish 1'],
              voucherType: 'twoDish'
            },
            typeB: {
              dishes: ['Dish 1'],
              voucherType: 'threeDish'
            }
          },
          {
            name: '套餐 2',
            calories: 0,
            tags: [],
            typeA: {
              dishes: ['Dish 1'],
              voucherType: 'twoDish'
            },
            typeB: {
              dishes: ['Dish 1'],
              voucherType: 'threeDish'
            }
          }
        ];
        
        for (const template of templateCombos) {
          const newComboId = `${nextDayId}-combo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          
          await fetch('/api/combos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              comboId: newComboId,
              dayId: nextDayId,
              ...template
            }),
          });
          
          // Small delay to ensure unique IDs
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // 3. Refresh data to show the updated weeks
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
        
        toast({
          title: "Success",
          description: "Week rolled forward successfully. This Week has been updated with Next Week's content, and Next Week's dates have been advanced.",
        });
      }
    } catch (error) {
      console.error('Error rolling forward week:', error);
      toast({
        title: "Error",
        description: `Failed to roll forward week: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsRollingForward(false);
    }
  };

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
        
        // Calculate date for next week (add 7 days) - use proper date calculation
        const nextWeekDate = calculateNextWeekDate(day.date);
        
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
      {/* Header with View History Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Daily Delivery Management</h2>
          <p className="text-muted-foreground mt-1">Manage delivery dates, menus, and combos</p>
        </div>
        <Button 
          variant="outline"
          onClick={() => {
            setShowHistoryModal(true);
            fetchHistory();
          }}
        >
          <History className="h-4 w-4 mr-2" />
          View History
        </Button>
      </div>
      
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
                      className="flex items-center h-8 px-3 text-xs"
                      onClick={() => {
                        setSelectedWeekNumber(1);
                        setShowDayCreationModal(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Day (This Week)
                    </Button>
                    
                    <Button 
                      size="sm"
                      variant="secondary"
                      className="flex items-center h-8 px-3 text-xs"
                      onClick={() => {
                        setSelectedWeekNumber(2);
                        setShowDayCreationModal(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Day (Next Week)
                    </Button>
                    
                    <Button 
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs"
                      onClick={rollForwardWeek}
                      disabled={isRollingForward}
                    >
                      {isRollingForward ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Rolling Forward...
                        </>
                      ) : (
                        <>
                          <RefreshCcw className="h-3 w-3 mr-1" />
                          Roll Forward Week
                        </>
                      )}
                    </Button>
                    
                    {/* Day Creation Modal */}
                    {showDayCreationModal && (
                      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                        <div className="bg-white rounded-lg shadow-lg w-[500px] max-w-[90vw]">
                          <div className="p-4 border-b">
                            <h3 className="text-lg font-medium">
                              Add Day ({selectedWeekNumber === 1 ? 'This Week' : 'Next Week'})
                            </h3>
                          </div>
                          
                          <div className="p-4 space-y-4">
                            <div className="space-y-2">
                              <Label>Select Day</Label>
                              <div className="grid grid-cols-3 gap-2">
                                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Sunday"].map((day) => (
                                  <Button
                                    key={day}
                                    variant={selectedDayOfWeek === day.toLowerCase() ? "default" : "outline"}
                                    className="w-full"
                                    onClick={() => {
                                      setSelectedDayOfWeek(day.toLowerCase());
                                      // If we already have a start date, recalculate dates based on the new day
                                      if (startDate) {
                                        setCalculatedDates(calculateDatesForWeek(day.toLowerCase(), startDate));
                                      }
                                    }}
                                  >
                                    {day}
                                  </Button>
                                ))}
                              </div>
                            </div>
                            
                            {selectedDayOfWeek && (
                              <div className="space-y-2">
                                <Label htmlFor="start-date">Date for {selectedDayOfWeek}</Label>
                                <Input
                                  id="start-date"
                                  placeholder="e.g. Dec 15"
                                  value={startDate}
                                  onChange={(e) => {
                                    const newDate = e.target.value;
                                    setStartDate(newDate);
                                    if (selectedDayOfWeek && newDate) {
                                      // Calculate dates for other days based on this date
                                      setCalculatedDates(calculateDatesForWeek(selectedDayOfWeek, newDate));
                                    }
                                  }}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Format: "MMM D" (e.g., "Dec 15")
                                </p>
                              </div>
                            )}
                            
                            {/* Removed the Calculated Dates section as requested */}
                          </div>
                          
                          <div className="p-4 border-t flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                // Close the modal and reset state
                                setShowDayCreationModal(false);
                                setSelectedDayOfWeek(null);
                                setStartDate('');
                                setCalculatedDates({
                                  monday: '',
                                  tuesday: '',
                                  wednesday: '',
                                  thursday: '',
                                  friday: '',
                                  sunday: ''
                                });
                              }}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Close
                            </Button>
                            
                            <Button
                              disabled={!selectedDayOfWeek || !startDate}
                              onClick={async () => {
                                if (!selectedDayOfWeek || !startDate) return;
                                
                                try {
                                  // Generate a new unique day ID
                                  const dayLower = selectedDayOfWeek.toLowerCase();
                                  const newDayId = `${dayLower}-w${selectedWeekNumber}-${Date.now()}`;
                                  
                                  // Get the date for this specific day
                                  const dateForDay = calculatedDates[dayLower];
                                  
                                  // Create new day via API
                                  const dayResponse = await fetch('/api/days', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      dayId: newDayId,
                                      date: dateForDay || startDate,
                                      displayName: dayLower,
                                      week: selectedWeekNumber,
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
                                      date: dateForDay || startDate,
                                      displayName: dayLower,
                                      week: selectedWeekNumber,
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
                                  
                                  // Switch to the appropriate week view
                                  setActiveWeekFilter(selectedWeekNumber);
                                  
                                  // Keep the modal open, just reset the form fields
                                  setSelectedDayOfWeek(null);
                                  setStartDate('');
                                  
                                  toast({
                                    title: 'Success',
                                    description: `${selectedDayOfWeek} (${dateForDay || startDate}) created successfully for ${selectedWeekNumber === 1 ? 'This Week' : 'Next Week'}`,
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
                              <Check className="h-4 w-4 mr-2" />
                              Create Day
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
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
                        .sort(([_, dayA], [__, dayB]) => {
                          // Define the correct order of days
                          const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'sunday'];
                          const indexA = dayOrder.indexOf(dayA.displayName.toLowerCase());
                          const indexB = dayOrder.indexOf(dayB.displayName.toLowerCase());
                          
                          // If both days are in the order array, sort by their position
                          if (indexA !== -1 && indexB !== -1) {
                            return indexA - indexB;
                          }
                          
                          // If only one is in the array, prioritize it
                          if (indexA !== -1) return -1;
                          if (indexB !== -1) return 1;
                          
                          // If neither is in the array, maintain original order
                          return 0;
                        })
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
                                    if (confirm(`Are you sure you want to delete ${day.displayName} (${day.date})?\n\nDay ID: ${dayId}`)) {
                                      try {
                                        console.log('Attempting to delete day:', { dayId, displayName: day.displayName, date: day.date });
                                        
                                        // Delete day via API
                                        const response = await fetch(`/api/days/${encodeURIComponent(dayId)}`, {
                                          method: 'DELETE',
                                        });
                                        
                                        console.log('Delete response status:', response.status);
                                        
                                        const data = await response.json();
                                        console.log('Delete response data:', data);
                                        
                                        if (data.success) {
                                          // Also delete all combos associated with this day
                                          const combosToDelete = day.combos || [];
                                          console.log(`Deleting ${combosToDelete.length} combos for this day`);
                                          
                                          for (const combo of combosToDelete) {
                                            try {
                                              await fetch(`/api/combos/${encodeURIComponent(combo.id)}`, {
                                                method: 'DELETE',
                                              });
                                            } catch (comboError) {
                                              console.warn('Error deleting combo:', combo.id, comboError);
                                            }
                                          }
                                          
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
                                  // Validate calories before saving
                                  if (combo.calories === 0) {
                                    toast({
                                      title: 'Validation Error',
                                      description: 'Please enter calories before saving',
                                      variant: 'destructive'
                                    });
                                    return;
                                  }
                                  
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
                              <Label htmlFor={`combo-calories-${combo.id}`}>
                                Calories <span className="text-red-500">*</span>
                              </Label>
                              <Input 
                                id={`combo-calories-${combo.id}`} 
                                type="number" 
                                value={combo.calories === 0 ? '' : combo.calories}
                                placeholder="Enter calories"
                                onChange={(e) => {
                                  const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                                  updateCombo(selectedDay, combo.id, { calories: value });
                                }}
                                className={combo.calories === 0 ? 'border-red-500 focus:border-red-500' : ''}
                              />
                              {combo.calories === 0 && (
                                <p className="text-xs text-red-500">Calories is required</p>
                              )}
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
                                  <div className="mt-4 space-y-2">
                                    <div className="flex gap-2">
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
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-1"
                                      onClick={() => syncDishesToTypeB(selectedDay, combo.id)}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-down-to-line"><path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/></svg>
                                      Sync to 3-Dish Option
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
      
      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Archived Days History</DialogTitle>
            <DialogDescription>
              View previously archived days and their menus from roll forward operations
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[70vh] pr-4">
            {isLoadingHistory ? (
              <div className="flex justify-center items-center h-[200px]">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Loading history...</p>
                </div>
              </div>
            ) : historyData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No archived history yet</p>
                <p className="text-sm mt-2">Days will be archived here when you roll forward weeks</p>
              </div>
            ) : !selectedWeekRange ? (
              // Show week range buttons
              <div className="space-y-3">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Select a Week to View
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Choose a week range to see the archived days and menus
                  </p>
                </div>
                {(() => {
                  // Group entries by when they were archived together (same roll forward operation)
                  // Use archivedAt timestamp rounded to the minute to group days archived in same operation
                  const weekGroups: Record<string, any[]> = {};
                  
                  historyData.forEach((entry) => {
                    const archivedDate = new Date(entry.archivedAt);
                    // Round to nearest minute to group operations that happened in same roll forward
                    const weekKey = `${archivedDate.getFullYear()}-${String(archivedDate.getMonth() + 1).padStart(2, '0')}-${String(archivedDate.getDate()).padStart(2, '0')}-${String(archivedDate.getHours()).padStart(2, '0')}-${String(archivedDate.getMinutes()).padStart(2, '0')}`;
                    
                    if (!weekGroups[weekKey]) {
                      weekGroups[weekKey] = [];
                    }
                    weekGroups[weekKey].push(entry);
                  });
                  
                  // Convert to array and calculate date ranges for each week
                  return Object.entries(weekGroups)
                    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()) // Sort by date, newest first
                    .map(([weekKey, entries]) => {
                      // Get the date range from the entries
                      const dates = entries.map(e => e.date);
                      
                      // Parse dates to get month and day
                      const parsedDates = dates.map(dateStr => {
                        const match = dateStr.match(/(\w+)\s+(\d+)/);
                        if (match) {
                          const monthMap: Record<string, number> = {
                            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
                          };
                          const month = monthMap[match[1]];
                          const day = parseInt(match[2]);
                          return { month: match[1], day, sortValue: month * 100 + day };
                        }
                        return null;
                      }).filter(Boolean);
                      
                      if (parsedDates.length === 0) return null;
                      
                      // Sort to get min and max dates
                      parsedDates.sort((a: any, b: any) => a.sortValue - b.sortValue);
                      const startDate = parsedDates[0] as any;
                      const endDate = parsedDates[parsedDates.length - 1] as any;
                      
                      if (!startDate || !endDate) return null;
                      
                      const weekRange = startDate.month === endDate.month
                        ? `${startDate.month} ${startDate.day} - ${endDate.day}`
                        : `${startDate.month} ${startDate.day} - ${endDate.month} ${endDate.day}`;
                      
                      const archivedDate = new Date(entries[0].archivedAt);
                      const dayCount = entries.length;
                      const totalCombos = entries.reduce((sum, e) => sum + e.combos.length, 0);
                      
                      return (
                        <Card 
                          key={weekKey} 
                          className="border-2 hover:border-primary/50 transition-all cursor-pointer"
                          onClick={() => setSelectedWeekRange(weekKey)}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-xl mb-2 flex items-center gap-2">
                                  <Calendar className="h-5 w-5 text-primary" />
                                  {weekRange}
                                </CardTitle>
                                <CardDescription className="flex flex-col gap-1">
                                  <span className="text-sm">
                                    Archived: {archivedDate.toLocaleString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      year: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                  <div className="flex items-center gap-4 mt-1">
                                    <Badge variant="secondary" className="text-xs">
                                      <Package className="h-3 w-3 mr-1" />
                                      {dayCount} {dayCount === 1 ? 'day' : 'days'}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      <Utensils className="h-3 w-3 mr-1" />
                                      {totalCombos} {totalCombos === 1 ? 'combo' : 'combos'}
                                    </Badge>
                                  </div>
                                </CardDescription>
                              </div>
                              <Button variant="outline" size="sm">
                                View Days
                                <ChevronDown className="h-4 w-4 ml-1 rotate-[-90deg]" />
                              </Button>
                            </div>
                          </CardHeader>
                        </Card>
                      );
                    })
                    .filter(Boolean);
                })()}
              </div>
            ) : (
              // Show days for selected week
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4 pb-3 border-b">
                  <div>
                    <h3 className="text-lg font-semibold">Week Details</h3>
                    <p className="text-sm text-muted-foreground">
                      Viewing archived days from this week
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedWeekRange(null);
                      setSelectedHistoryEntry(null);
                    }}
                  >
                    <ChevronDown className="h-4 w-4 mr-1 rotate-90" />
                    Back to Weeks
                  </Button>
                </div>
                
                {historyData
                  .filter((entry) => {
                    const archivedDate = new Date(entry.archivedAt);
                    const entryWeekKey = `${archivedDate.getFullYear()}-${String(archivedDate.getMonth() + 1).padStart(2, '0')}-${String(archivedDate.getDate()).padStart(2, '0')}-${String(archivedDate.getHours()).padStart(2, '0')}-${String(archivedDate.getMinutes()).padStart(2, '0')}`;
                    return entryWeekKey === selectedWeekRange;
                  })
                  .sort((a, b) => {
                    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'sunday'];
                    return dayOrder.indexOf(a.displayName) - dayOrder.indexOf(b.displayName);
                  })
                  .map((entry) => (
                  <Card key={entry.historyId} className="border">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg capitalize flex items-center gap-2">
                            {entry.displayName}
                            <Badge variant="outline" className={entry.week === 1 ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}>
                              {entry.week === 1 ? 'This Week' : 'Next Week'}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Date: {entry.date} • Archived: {new Date(entry.archivedAt).toLocaleString()}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedHistoryEntry(selectedHistoryEntry === entry.historyId ? null : entry.historyId)}
                          >
                            {selectedHistoryEntry === entry.historyId ? 'Hide Details' : 'View Details'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={async () => {
                              if (confirm('Delete this history entry permanently?')) {
                                try {
                                  const response = await fetch(`/api/day-history/${entry.historyId}`, {
                                    method: 'DELETE',
                                  });
                                  const data = await response.json();
                                  if (data.success) {
                                    setHistoryData(prev => prev.filter(h => h.historyId !== entry.historyId));
                                    toast({
                                      title: 'Success',
                                      description: 'History entry deleted',
                                    });
                                  }
                                } catch (error) {
                                  toast({
                                    title: 'Error',
                                    description: 'Failed to delete history entry',
                                    variant: 'destructive'
                                  });
                                }
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {selectedHistoryEntry === entry.historyId && (
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="text-sm text-muted-foreground mb-2">
                            {entry.combos.length} combo(s) archived
                          </div>
                          {entry.combos.map((combo: any, idx: number) => (
                            <Card key={idx} className="border bg-muted/30">
                              <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-base">{combo.name}</CardTitle>
                                  <Badge variant="outline">{combo.calories} KCAL</Badge>
                                  {combo.tags.map((tag: string) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h5 className="font-medium text-sm mb-2 text-blue-700">2-Dish Option</h5>
                                    <div className="space-y-1">
                                      {combo.typeA.dishes.map((dish: string, dishIdx: number) => (
                                        <div key={dishIdx} className="text-sm py-1 px-2 rounded bg-blue-50">
                                          {dishIdx + 1}. {dish}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <h5 className="font-medium text-sm mb-2 text-green-700">3-Dish Option</h5>
                                    <div className="space-y-1">
                                      {combo.typeB.dishes.map((dish: string, dishIdx: number) => (
                                        <div key={dishIdx} className="text-sm py-1 px-2 rounded bg-green-50">
                                          {dishIdx + 1}. {dish}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
