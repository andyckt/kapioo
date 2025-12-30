"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Calendar, Edit, Plus, Trash2, Loader2, Save, RefreshCcw, History, ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { 
  MealOption, 
  DeliveryDay, 
  DeliverySection,
  getAdminWeeklySubscription,
  updateDeliveryDay,
  addMealOption,
  updateMealOption,
  deleteMealOption
} from "@/lib/weekly-subscription"

export function WeeklySubscriptionManagement() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [savingDateId, setSavingDateId] = useState<string | null>(null)
  const [deliverySections, setDeliverySections] = useState<DeliverySection[]>([])
  const [editingMeal, setEditingMeal] = useState<MealOption | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addMealDialogOpen, setAddMealDialogOpen] = useState(false)
  const [newMealSection, setNewMealSection] = useState<string>('')
  const [newMeal, setNewMeal] = useState<Partial<MealOption>>({ name: '', tags: [], active: true })
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [mealToDelete, setMealToDelete] = useState<MealOption | null>(null)
  const [isRollingForward, setIsRollingForward] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<any | null>(null)
  const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null)
  
  // Fetch delivery sections from API
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await getAdminWeeklySubscription();
      if (data && data.length > 0) {
        setDeliverySections(data);
      } else {
        // If no data returned, use fallback mock data
        toast({
          title: "Failed to load data",
          description: "Using fallback data. Please try again later.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching weekly subscription data:", error);
      toast({
        title: "Error",
        description: "Failed to load weekly subscription data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [])
  
  // Helper function to parse date string (e.g., "January 5" or "Jan 5" → Date object)
  const parseDateString = (dateStr: string): Date | null => {
    const dateMatch = dateStr.match(/(\w+)\s+(\d+)/);
    if (dateMatch && dateMatch.length >= 3) {
      const month = dateMatch[1]; // e.g., "January" or "Jan"
      const dayNum = parseInt(dateMatch[2], 10); // e.g., 5
      
      // Map both full and short month names to month number (0-based)
      const monthMap: Record<string, number> = {
        'January': 0, 'Jan': 0,
        'February': 1, 'Feb': 1,
        'March': 2, 'Mar': 2,
        'April': 3, 'Apr': 3,
        'May': 4,
        'June': 5, 'Jun': 5,
        'July': 6, 'Jul': 6,
        'August': 7, 'Aug': 7,
        'September': 8, 'Sep': 8,
        'October': 9, 'Oct': 9,
        'November': 10, 'Nov': 10,
        'December': 11, 'Dec': 11
      };
      
      if (monthMap[month] !== undefined) {
        const currentYear = new Date().getFullYear();
        return new Date(currentYear, monthMap[month], dayNum);
      }
    }
    return null;
  };
  
  // Helper function to format a Date object to "MMMM D" format (e.g., "January 5")
  const formatDateToString = (date: Date): string => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };
  
  // Helper function to calculate next week's date (+7 days)
  const calculateNextWeekDate = (dateStr: string): string => {
    const date = parseDateString(dateStr);
    if (!date) return dateStr;
    
    // Add 7 days
    date.setDate(date.getDate() + 7);
    
    // Format back to "MMMM D" format
    return formatDateToString(date);
  };
  
  // Fetch history data
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/weekly-delivery-history?limit=100');
      const data = await response.json();
      
      if (data.success) {
        setHistoryData(data.data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast({
        title: "Error",
        description: "Failed to load history data",
        variant: "destructive"
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };
  
  // Delete history entry
  const handleDeleteHistory = async (historyId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent card click when clicking delete
    }
    
    setDeletingHistoryId(historyId);
    
    try {
      const response = await fetch(`/api/weekly-delivery-history/${historyId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove from local state
        setHistoryData(prev => prev.filter(entry => entry.historyId !== historyId));
        
        // If we're viewing the deleted entry, go back to list
        if (selectedHistoryEntry?.historyId === historyId) {
          setSelectedHistoryEntry(null);
        }
        
        toast({
          title: "History deleted",
          description: "The history entry has been deleted successfully."
        });
      } else {
        throw new Error(data.error || 'Failed to delete history');
      }
    } catch (error) {
      console.error('Error deleting history:', error);
      toast({
        title: "Error",
        description: "Failed to delete history entry",
        variant: "destructive"
      });
    } finally {
      setDeletingHistoryId(null);
    }
  };
  
  // Roll Forward Week function
  const rollForwardWeek = async () => {
    try {
      if (!confirm("This will roll forward the weekly menu. This Week will be archived, Next Week becomes This Week, Week 3 becomes Next Week, and a new Week 3 will be created. Continue?")) {
        return;
      }

      setIsRollingForward(true);

      // Get sections by week offset
      const thisWeekSections = deliverySections.filter(s => s.day.weekOffset === 0);
      const nextWeekSections = deliverySections.filter(s => s.day.weekOffset === 1);
      const week3Sections = deliverySections.filter(s => s.day.weekOffset === 2);
      
      console.log('🔄 Before roll forward:');
      console.log('This Week:', thisWeekSections.map(s => ({ day: s.day.day, date: s.day.date })));
      console.log('Next Week:', nextWeekSections.map(s => ({ day: s.day.day, date: s.day.date })));
      console.log('Week 3:', week3Sections.map(s => ({ day: s.day.day, date: s.day.date })));
      
      // Store CURRENT Week 3 dates before any updates
      // These will be used to calculate the NEW Week 3 dates (current Week 3 + 7 days)
      const currentWeek3Dates = new Map(
        week3Sections.map(s => [s.day.day, s.day.date])
      );
      console.log('📅 Current Week 3 dates stored:', Object.fromEntries(currentWeek3Dates));

      // Step 0: Archive This Week
      console.log('Archiving This Week...');
      for (const section of thisWeekSections) {
        try {
          const historyId = `history-${section.day.day}-${section.day.weekOffset}-${Date.now()}`;
          await fetch('/api/weekly-delivery-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              historyId,
              originalDay: section.day.day,
              originalWeekOffset: section.day.weekOffset,
              displayName: section.title,
              date: section.day.date,
              archivedReason: 'rolled_forward',
              mealOptions: section.day.options.map(opt => ({
                id: opt.id,
                name: opt.name,
                tags: opt.tags,
                active: opt.active
              }))
            }),
          });
          console.log(`Archived: ${section.title} ${section.day.date}`);
        } catch (error) {
          console.error(`Error archiving ${section.title}:`, error);
        }
      }

      // Step 1: Copy Next Week meal options to This Week
      console.log('Moving Next Week → This Week...');
      for (const nextSection of nextWeekSections) {
        // Find corresponding This Week section
        const thisSection = thisWeekSections.find(s => s.day.day === nextSection.day.day);
        if (!thisSection) continue;
        
        // Delete old This Week meal options
        for (const option of thisSection.day.options) {
          await fetch(`/api/weekly-subscription/meal-options/${option.id}`, {
            method: 'DELETE'
          });
        }
        
        // Create new meal options for This Week (copies from Next Week)
        const newOptionIds = [];
        for (const option of nextSection.day.options) {
          const mealResponse = await fetch('/api/weekly-subscription/meal-options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              day: thisSection.day.day,
              weekOffset: 0,
              name: option.name,
              tags: option.tags,
              active: option.active
            }),
          });
          
          if (mealResponse.ok) {
            const mealData = await mealResponse.json();
            newOptionIds.push(mealData.data.mealOption._id);
          }
        }
        
        // Update This Week day with new date and meal options
        await fetch('/api/weekly-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            day: thisSection.day.day,
            weekOffset: 0,
            date: nextSection.day.date,
            active: nextSection.day.active
          }),
        });
      }

      // Step 2: Copy Week 3 meal options to Next Week
      console.log('Moving Week 3 → Next Week...');
      for (const week3Section of week3Sections) {
        // Find corresponding Next Week section
        const nextSection = nextWeekSections.find(s => s.day.day === week3Section.day.day);
        if (!nextSection) continue;
        
        // Delete old Next Week meal options
        for (const option of nextSection.day.options) {
          await fetch(`/api/weekly-subscription/meal-options/${option.id}`, {
            method: 'DELETE'
          });
        }
        
        // Create new meal options for Next Week (copies from Week 3)
        const newOptionIds = [];
        for (const option of week3Section.day.options) {
          const mealResponse = await fetch('/api/weekly-subscription/meal-options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              day: nextSection.day.day,
              weekOffset: 1,
              name: option.name,
              tags: option.tags,
              active: option.active
            }),
          });
          
          if (mealResponse.ok) {
            const mealData = await mealResponse.json();
            newOptionIds.push(mealData.data.mealOption._id);
          }
        }
        
        // Update Next Week day with new date and meal options
        await fetch('/api/weekly-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            day: nextSection.day.day,
            weekOffset: 1,
            date: week3Section.day.date,
            active: week3Section.day.active
          }),
        });
      }

      // Step 3: Create new Week 3 with template meal
      console.log('🆕 Creating new Week 3...');
      for (const week3Section of week3Sections) {
        // Get the CURRENT Week 3 date (before Step 2 moved it to Next Week)
        const currentDate = currentWeek3Dates.get(week3Section.day.day);
        if (!currentDate) {
          console.error(`❌ Current date not found for ${week3Section.day.day}`);
          continue;
        }
        
        // Calculate new date: current Week 3 date + 7 days
        const newDate = calculateNextWeekDate(currentDate);
        
        console.log(`📅 Calculating new Week 3 date for ${week3Section.day.day}: ${currentDate} + 7 days = ${newDate}`);
        
        // Delete old Week 3 meal options
        for (const option of week3Section.day.options) {
          await fetch(`/api/weekly-subscription/meal-options/${option.id}`, {
            method: 'DELETE'
          });
        }
        
        // Create a template meal option
        const mealResponse = await fetch('/api/weekly-subscription/meal-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            day: week3Section.day.day,
            weekOffset: 2,
            name: 'Dish 1',
            tags: [],
            active: true
          }),
        });
        
        if (!mealResponse.ok) {
          throw new Error(`Failed to create template meal for Week 3 ${week3Section.day.day}`);
        }
        
        // Update Week 3 day with new date
        await fetch('/api/weekly-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            day: week3Section.day.day,
            weekOffset: 2,
            date: newDate,
            active: true
          }),
        });
        
        console.log(`✅ Week 3 ${week3Section.day.day} updated to ${newDate}`);
      }

      // Step 4: Refresh data
      await fetchData();

      toast({
        title: "Success",
        description: "Week rolled forward successfully. This Week has been archived, and menus have been updated.",
      });
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
  
  // Toggle day active status
  const toggleDayActive = async (sectionId: string) => {
    const section = deliverySections.find(s => s.id === sectionId);
    if (!section) return;
    
    // Optimistically update UI
    setDeliverySections(sections => 
      sections.map(s => 
        s.id === sectionId 
          ? { ...s, day: { ...s.day, active: !s.day.active } } 
          : s
      )
    );
    
    // Update in database - include weekOffset to ensure correct record is updated
    const success = await updateDeliveryDay(section.day.id, { 
      active: !section.day.active,
      weekOffset: section.day.weekOffset // Add weekOffset parameter to identify the correct week
    });
    
    console.log(`Toggling ${section.day.id} with weekOffset=${section.day.weekOffset} to active=${!section.day.active}`);
    
    if (!success) {
      // Revert if failed
      setDeliverySections(sections => 
        sections.map(s => 
          s.id === sectionId 
            ? { ...s, day: { ...s.day, active: section.day.active } } 
            : s
        )
      );
      
      toast({
        title: "Failed to update",
        description: "Could not update delivery day status",
        variant: "destructive"
      });
    }
  }
  
  // Toggle meal option active status
  const toggleMealActive = async (sectionId: string, mealId: string) => {
    const section = deliverySections.find(s => s.id === sectionId);
    if (!section) return;
    
    const meal = section.day.options.find(o => o.id === mealId);
    if (!meal) return;
    
    // Optimistically update UI
    setDeliverySections(sections => 
      sections.map(s => 
        s.id === sectionId 
          ? {
              ...s,
              day: {
                ...s.day,
                options: s.day.options.map(o => 
                  o.id === mealId 
                    ? { ...o, active: !o.active }
                    : o
                )
              }
            }
          : s
      )
    );
    
    // Update in database
    const updatedMeal = await updateMealOption(mealId, { active: !meal.active });
    
    if (!updatedMeal) {
      // Revert if failed
      setDeliverySections(sections => 
        sections.map(s => 
          s.id === sectionId 
            ? {
                ...s,
                day: {
                  ...s.day,
                  options: s.day.options.map(o => 
                    o.id === mealId 
                      ? { ...o, active: meal.active }
                      : o
                  )
                }
              }
            : s
        )
      );
      
      toast({
        title: "Failed to update",
        description: "Could not update meal option status",
        variant: "destructive"
      });
    }
  }
  
  // Open edit dialog for a meal
  const handleEditMeal = (meal: MealOption) => {
    setEditingMeal({ ...meal })
    setEditDialogOpen(true)
  }
  
  // Save edited meal
  const handleSaveMeal = async () => {
    if (!editingMeal) return;
    
    // Store the original meal for rollback if needed
    const originalSections = [...deliverySections];
    
    // Optimistically update UI
    setDeliverySections(sections => 
      sections.map(section => ({
        ...section,
        day: {
          ...section.day,
          options: section.day.options.map(option => 
            option.id === editingMeal.id ? editingMeal : option
          )
        }
      }))
    );
    
    setEditDialogOpen(false);
    
    // Update in database
    const updatedMeal = await updateMealOption(editingMeal.id, {
      name: editingMeal.name,
      tags: editingMeal.tags,
      active: editingMeal.active
    });
    
    if (updatedMeal) {
      toast({
        title: "Meal updated",
        description: "The meal option has been updated successfully."
      });
    } else {
      // Revert if failed
      setDeliverySections(originalSections);
      
      toast({
        title: "Failed to update",
        description: "Could not update meal option",
        variant: "destructive"
      });
    }
  }
  
  // Open delete confirmation dialog
  const handleDeleteClick = (meal: MealOption) => {
    setMealToDelete(meal)
    setConfirmDeleteOpen(true)
  }
  
  // Confirm delete meal
  const handleConfirmDelete = async () => {
    if (!mealToDelete) return;
    
    // Store the original sections for rollback if needed
    const originalSections = [...deliverySections];
    
    // Optimistically update UI
    setDeliverySections(sections => 
      sections.map(section => ({
        ...section,
        day: {
          ...section.day,
          options: section.day.options.filter(option => option.id !== mealToDelete.id)
        }
      }))
    );
    
    setConfirmDeleteOpen(false);
    
    // Delete from database
    const success = await deleteMealOption(mealToDelete.id);
    
    if (success) {
      toast({
        title: "Meal deleted",
        description: "The meal option has been deleted successfully."
      });
    } else {
      // Revert if failed
      setDeliverySections(originalSections);
      
      toast({
        title: "Failed to delete",
        description: "Could not delete meal option",
        variant: "destructive"
      });
    }
  }
  
  // Open add meal dialog
  const handleAddMealClick = (sectionId: string) => {
    setNewMealSection(sectionId)
    setNewMeal({
      name: "",
      tags: [],
      active: true
    })
    setAddMealDialogOpen(true)
  }
  
  // Add new meal option after form submission
  const handleAddMealSubmit = async () => {
    if (!newMealSection || !newMeal.name) return;
    
    const section = deliverySections.find(s => s.id === newMealSection);
    if (!section) return;
    
    // Close dialog and show loading state
    setAddMealDialogOpen(false);
    setIsLoading(true);
    
    console.log('Adding meal option to section:', {
      sectionId: section.id,
      day: section.day.id,
      weekOffset: section.day.weekOffset,
      name: newMeal.name
    });
    
    // Add to database - pass day ID and weekOffset instead of section ID
    const result = await addMealOption(
      section.day.id,
      section.day.weekOffset,
      {
        name: newMeal.name,
        tags: newMeal.tags || [],
        active: newMeal.active !== undefined ? newMeal.active : true
      }
    );
    
    if (result && result.mealOption && result.deliveryDay) {
      // Refresh data from API to get the updated list with proper IDs
      const updatedData = await getAdminWeeklySubscription();
      if (updatedData && updatedData.length > 0) {
        setDeliverySections(updatedData);
      }
      
      toast({
        title: "Meal added",
        description: "The new meal option has been added successfully."
      });
    } else {
      toast({
        title: "Failed to add",
        description: "Could not add new meal option",
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Header with buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Weekly Meal Box Management</h2>
          <p className="text-muted-foreground mt-1">Manage Sunday and Tuesday deliveries across 3 weeks</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
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
          <Button 
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={rollForwardWeek}
            disabled={isRollingForward}
          >
            {isRollingForward ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Rolling Forward...
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Roll Forward Week
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-[300px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading subscription data...</p>
            </div>
          </div>
        ) : deliverySections.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {deliverySections.map((section) => (
              <Card key={section.id} className={`border ${!section.day.active ? 'border-dashed opacity-70' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Input 
                          className="w-40 text-sm" 
                          value={section.day.date} 
                          onChange={(e) => {
                            setDeliverySections(sections => 
                              sections.map(s => 
                                s.id === section.id 
                                  ? { ...s, day: { ...s.day, date: e.target.value } } 
                                  : s
                              )
                            );
                          }}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={savingDateId === section.id}
                          onClick={async () => {
                            setSavingDateId(section.id);
                            try {
                            const success = await updateDeliveryDay(section.day.id, { 
                              date: section.day.date,
                              weekOffset: section.day.weekOffset
                            });
                              
                              if (success) {
                                toast({
                                  title: "Date updated",
                                  description: "The delivery date has been updated successfully."
                                });
                              } else {
                                toast({
                                  title: "Failed to update",
                                  description: "Could not update the delivery date",
                                  variant: "destructive"
                                });
                              }
                            } catch (error) {
                              console.error("Error updating date:", error);
                              toast({
                                title: "Error",
                                description: "An unexpected error occurred",
                                variant: "destructive"
                              });
                            } finally {
                              setSavingDateId(null);
                            }
                          }}
                        >
                          {savingDateId === section.id ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Saving...
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Save className="h-3 w-3" />
                              Save
                            </span>
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id={`${section.id}-active`} 
                          checked={section.day.active} 
                          onCheckedChange={() => toggleDayActive(section.id)} 
                        />
                        <Label htmlFor={`${section.id}-active`} className="text-sm">
                          {section.day.active ? 'Active' : 'Inactive'}
                        </Label>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {section.day.options.map((option) => (
                      <div 
                        key={option.id} 
                        className={`flex items-center justify-between p-3 rounded-md border ${!option.active ? 'border-dashed opacity-70' : 'bg-muted/50'}`}
                      >
                        <div>
                          <div className="font-medium">{option.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {option.tags?.map((tag) => (
                              <Badge key={tag} variant="outline" className="mr-1">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            id={`${option.id}-active`} 
                            checked={option.active} 
                            onCheckedChange={() => toggleMealActive(section.id, option.id)} 
                            className="mr-2"
                          />
                          <Button variant="ghost" size="icon" onClick={() => handleEditMeal(option)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(option)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      className="w-full mt-2" 
                      onClick={() => handleAddMealClick(section.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Meal Option
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center h-[300px]">
            <p>No delivery data available</p>
          </div>
        )}
      </div>
      
      {/* Edit Meal Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Meal Option</DialogTitle>
            <DialogDescription>
              Make changes to the meal option details below.
            </DialogDescription>
          </DialogHeader>
          {editingMeal && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="meal-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="meal-name"
                  value={editingMeal.name}
                  onChange={(e) => setEditingMeal({...editingMeal, name: e.target.value})}
                  className="col-span-3"
                />
              </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="meal-tags" className="text-right pt-2">
                Tags
              </Label>
              <div className="col-span-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {editingMeal.tags?.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="px-2 py-1 flex items-center gap-1"
                    >
                      {tag}
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-4 w-4 p-0 hover:bg-transparent" 
                        onClick={() => {
                          const newTags = [...(editingMeal.tags || [])];
                          newTags.splice(index, 1);
                          setEditingMeal({ ...editingMeal, tags: newTags });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <Input
                  id="meal-tags"
                  placeholder="Type a tag and press Enter"
                  className="w-full"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      e.preventDefault();
                      const newTag = e.currentTarget.value.trim();
                      if (newTag && (!editingMeal.tags || !editingMeal.tags.includes(newTag))) {
                        setEditingMeal({
                          ...editingMeal,
                          tags: [...(editingMeal.tags || []), newTag]
                        });
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">Press Enter to add a tag</p>
              </div>
            </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="meal-active" className="text-right">
                  Active
                </Label>
                <div className="col-span-3 flex items-center">
                  <Switch 
                    id="meal-active" 
                    checked={editingMeal.active} 
                    onCheckedChange={(checked) => setEditingMeal({...editingMeal, active: checked})} 
                  />
                  <Label htmlFor="meal-active" className="ml-2">
                    {editingMeal.active ? 'Active' : 'Inactive'}
                  </Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveMeal}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Meal Dialog */}
      <Dialog open={addMealDialogOpen} onOpenChange={setAddMealDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Meal Option</DialogTitle>
            <DialogDescription>
              Enter the details for the new meal option.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-meal-name" className="text-right">
                Name
              </Label>
              <Input
                id="new-meal-name"
                value={newMeal.name || ''}
                onChange={(e) => setNewMeal({...newMeal, name: e.target.value})}
                className="col-span-3"
                placeholder="Enter meal name"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="new-meal-tags" className="text-right pt-2">
                Tags
              </Label>
              <div className="col-span-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {newMeal.tags?.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="px-2 py-1 flex items-center gap-1"
                    >
                      {tag}
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-4 w-4 p-0 hover:bg-transparent" 
                        onClick={() => {
                          const newTags = [...(newMeal.tags || [])];
                          newTags.splice(index, 1);
                          setNewMeal({ ...newMeal, tags: newTags });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <Input
                  id="new-meal-tags"
                  placeholder="Type a tag and press Enter"
                  className="w-full"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      e.preventDefault();
                      const newTag = e.currentTarget.value.trim();
                      if (newTag && (!newMeal.tags || !newMeal.tags.includes(newTag))) {
                        setNewMeal({
                          ...newMeal,
                          tags: [...(newMeal.tags || []), newTag]
                        });
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">Press Enter to add a tag</p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-meal-active" className="text-right">
                Active
              </Label>
              <div className="col-span-3 flex items-center">
                <Switch 
                  id="new-meal-active" 
                  checked={newMeal.active !== undefined ? newMeal.active : true} 
                  onCheckedChange={(checked) => setNewMeal({...newMeal, active: checked})} 
                />
                <Label htmlFor="new-meal-active" className="ml-2">
                  {newMeal.active !== undefined ? (newMeal.active ? 'Active' : 'Inactive') : 'Active'}
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMealDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMealSubmit} disabled={!newMeal.name}>Add Meal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this meal option? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={(open) => {
        setShowHistoryModal(open);
        if (!open) {
          setSelectedHistoryEntry(null);
        }
      }}>
        <DialogContent className="max-w-[1100px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {selectedHistoryEntry ? (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedHistoryEntry(null)}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span>Delivery Details</span>
                </div>
              ) : (
                'Weekly Delivery History'
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedHistoryEntry 
                ? `Viewing details for ${selectedHistoryEntry.date}`
                : 'Select a date to view archived meal details'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 -mr-2 min-h-0">
            {isLoadingHistory ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : historyData.length === 0 ? (
              <div className="flex justify-center items-center py-20">
                <p className="text-muted-foreground">No history available</p>
              </div>
            ) : selectedHistoryEntry ? (
              // Step 2: Show meal details for selected date
              <div className="space-y-4 pb-4">
                <Card className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">
                          {selectedHistoryEntry.displayName}
                        </p>
                        <CardTitle className="text-2xl">{selectedHistoryEntry.date}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-2">
                          Archived: {new Date(selectedHistoryEntry.archivedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={selectedHistoryEntry.archivedReason === 'rolled_forward' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                          {selectedHistoryEntry.archivedReason === 'rolled_forward' ? 'Rolled Forward' : 'Manually Deleted'}
                        </Badge>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteHistory(selectedHistoryEntry.historyId)}
                          disabled={deletingHistoryId === selectedHistoryEntry.historyId}
                        >
                          {deletingHistoryId === selectedHistoryEntry.historyId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
                
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Meal Options ({selectedHistoryEntry.mealOptions?.length || 0})
                  </h3>
                  {selectedHistoryEntry.mealOptions && selectedHistoryEntry.mealOptions.length > 0 ? (
                    selectedHistoryEntry.mealOptions.map((option: any, idx: number) => (
                      <Card key={idx} className="border-l-4 border-l-primary/30 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-base">{option.name}</h4>
                                <Badge variant={option.active ? 'default' : 'secondary'} className="text-xs">
                                  {option.active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              {option.tags && option.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {option.tags.map((tag: string, tagIdx: number) => (
                                    <Badge key={tagIdx} variant="outline" className="text-xs px-2 py-0.5">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <p className="text-sm text-muted-foreground">No meal options available</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            ) : (
              // Step 1: Cute square date picker grid
              <div className="space-y-4 pb-4">
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground">
                    Click on a date to view its meal details
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {historyData.map((entry) => {
                    // Parse the date to extract day and month
                    const dateMatch = entry.date.match(/(\w+)\s+(\d+)/);
                    const month = dateMatch ? dateMatch[1] : '';
                    const day = dateMatch ? dateMatch[2] : '';
                    
                    return (
                      <Card 
                        key={entry.historyId}
                        className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-200 group overflow-hidden relative"
                        onClick={() => setSelectedHistoryEntry(entry)}
                      >
                        {/* Delete Button - Top Right Corner */}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md"
                          onClick={(e) => handleDeleteHistory(entry.historyId, e)}
                          disabled={deletingHistoryId === entry.historyId}
                        >
                          {deletingHistoryId === entry.historyId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                        
                        <CardContent className="p-0">
                          {/* Date Display - Square Top Section */}
                          <div className="bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-colors p-6 text-center border-b">
                            <div className="text-4xl font-bold text-primary mb-1">
                              {day}
                            </div>
                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                              {month}
                            </div>
                          </div>
                          
                          {/* Info Section */}
                          <div className="p-4 space-y-2">
                            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span className="truncate">
                                {entry.displayName.replace('This Week ', '').replace('Next Week ', '')}
                              </span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {entry.mealOptions?.length || 0} meal{entry.mealOptions?.length !== 1 ? 's' : ''}
                              </Badge>
                              <Badge 
                                variant={entry.archivedReason === 'rolled_forward' ? 'default' : 'secondary'} 
                                className="text-xs"
                              >
                                {entry.archivedReason === 'rolled_forward' ? 'Rolled' : 'Deleted'}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}