"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Calendar, Edit, Plus, Trash2, Loader2, Save, RefreshCcw, History, ChevronLeft, ChevronRight, Languages, Mail, Send, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import { WeeklyMenuEditDialog } from "@/features/admin-weekly-menu/weekly-menu-edit-dialog"
import { useWeeklyMenuHistory } from "@/features/admin-weekly-menu/use-weekly-menu-history"
import { WeeklyMenuHistoryDialog } from "@/features/admin-weekly-menu/weekly-menu-history-dialog"
import {
  WeeklyMenuNotificationDialogs,
  type WeeklyMenuNotificationProgress,
} from "@/features/admin-weekly-menu/weekly-menu-notification-dialogs"
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
import { parseBulkInput } from "@/lib/bulk-parse-utils"

export function WeeklySubscriptionManagement() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [savingDateId, setSavingDateId] = useState<string | null>(null)
  const [deliverySections, setDeliverySections] = useState<DeliverySection[]>([])
  const [editingMeal, setEditingMeal] = useState<MealOption | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [mealToDelete, setMealToDelete] = useState<MealOption | null>(null)
  const [isRollingForward, setIsRollingForward] = useState(false)
  const [addingMealToSection, setAddingMealToSection] = useState<string | null>(null)
  const [newInlineMealName, setNewInlineMealName] = useState('')
  const [isSavingInlineMeal, setIsSavingInlineMeal] = useState(false)
  const [bulkMeals, setBulkMeals] = useState<Record<string, string>>({})
  const [removeExisting, setRemoveExisting] = useState<Record<string, boolean>>({})
  const [editingEnglishForMealId, setEditingEnglishForMealId] = useState<string | null>(null)
  const [inlineEnglishName, setInlineEnglishName] = useState('')
  const [editingChineseForMealId, setEditingChineseForMealId] = useState<string | null>(null)
  const [inlineChineseName, setInlineChineseName] = useState('')
  
  // State for menu update notification
  const [isSendingNotifications, setIsSendingNotifications] = useState(false)
  const [showNotificationDialog, setShowNotificationDialog] = useState(false)
  const [showProgressDialog, setShowProgressDialog] = useState(false)
  const [notificationProgress, setNotificationProgress] = useState<WeeklyMenuNotificationProgress>({
    totalUsers: 0,
    emailsSent: 0,
    emailsFailed: 0,
    currentBatch: 0,
    totalBatches: 0,
    progress: 0,
    logs: [],
    failedEmails: [],
    isComplete: false
  })
  const {
    showHistoryModal,
    setShowHistoryModal,
    historyData,
    isLoadingHistory,
    selectedHistoryEntry,
    setSelectedHistoryEntry,
    deletingHistoryId,
    fetchHistory,
    handleDeleteHistory,
  } = useWeeklyMenuHistory()
  
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
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
                nameEn: opt.nameEn, // Include English translation
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
              nameEn: option.nameEn, // ✅ Include English translation
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
              nameEn: option.nameEn, // ✅ Include English translation
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
  
  // Start inline English translation edit
  const handleStartEnglishEdit = (meal: MealOption) => {
    setEditingEnglishForMealId(meal.id)
    setInlineEnglishName(meal.nameEn || '')
  }
  
  // Cancel inline English edit
  const handleCancelEnglishEdit = () => {
    setEditingEnglishForMealId(null)
    setInlineEnglishName('')
  }
  
  // Save inline English translation
  const handleSaveInlineEnglish = async (mealId: string) => {
    const trimmedName = inlineEnglishName.trim()
    
    // Update the meal option with English name
    const updatedMeal = await updateMealOption(mealId, {
      nameEn: trimmedName
    });
    
    if (updatedMeal) {
      // Update local state without refreshing
      setDeliverySections(sections => 
        sections.map(section => ({
          ...section,
          day: {
            ...section.day,
            options: section.day.options.map(option => 
              option.id === mealId ? { ...option, nameEn: trimmedName } : option
            )
          }
        }))
      );
      
      // Show success toast
      toast({
        title: "English translation updated",
        description: "The English name has been saved successfully."
      });
      
      // Reset inline edit state
      setEditingEnglishForMealId(null)
      setInlineEnglishName('')
    } else {
      toast({
        title: "Failed to update",
        description: "Could not save English translation",
        variant: "destructive"
      });
    }
  }
  
  // Start inline Chinese name edit
  const handleStartChineseEdit = (meal: MealOption) => {
    setEditingChineseForMealId(meal.id)
    setInlineChineseName(meal.name)
  }
  
  // Cancel inline Chinese edit
  const handleCancelChineseEdit = () => {
    setEditingChineseForMealId(null)
    setInlineChineseName('')
  }
  
  // Save inline Chinese name
  const handleSaveInlineChinese = async (mealId: string) => {
    const trimmedName = inlineChineseName.trim()
    
    if (!trimmedName) {
      toast({
        title: "Error",
        description: "Chinese name cannot be empty",
        variant: "destructive"
      })
      return
    }
    
    // Update the meal option with Chinese name
    const updatedMeal = await updateMealOption(mealId, {
      name: trimmedName
    });
    
    if (updatedMeal) {
      // Update local state without refreshing
      setDeliverySections(sections => 
        sections.map(section => ({
          ...section,
          day: {
            ...section.day,
            options: section.day.options.map(option => 
              option.id === mealId ? { ...option, name: trimmedName } : option
            )
          }
        }))
      );
      
      // Show success toast
      toast({
        title: "Chinese name updated",
        description: "The dish name has been saved successfully."
      });
      
      // Reset inline edit state
      setEditingChineseForMealId(null)
      setInlineChineseName('')
    } else {
      toast({
        title: "Failed to update",
        description: "Could not save Chinese name",
        variant: "destructive"
      });
    }
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
      nameEn: editingMeal.nameEn,
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
  
  // Start inline add meal
  const handleAddMealClick = (sectionId: string) => {
    setAddingMealToSection(sectionId);
    setNewInlineMealName('');
  };
  
  // Cancel inline add meal
  const handleCancelInlineAdd = () => {
    setAddingMealToSection(null);
    setNewInlineMealName('');
  };
  
  // Save inline meal (on Enter key)
  const handleSaveInlineMeal = async (sectionId: string) => {
    if (!newInlineMealName.trim()) {
      handleCancelInlineAdd();
      return;
    }
    
    setIsSavingInlineMeal(true);
    
    try {
      const section = deliverySections.find(s => s.id === sectionId);
      if (!section) return;
      
      const newMeal = await addMealOption(
        section.day.day,
        section.day.weekOffset,
        {
          name: newInlineMealName.trim(),
          tags: [],
          active: true // Always default to active
        }
      );
      
      if (newMeal) {
        // Refresh data to show the new meal
        await fetchData();
        
        toast({
          title: "Meal added",
          description: "The new meal option has been added successfully."
        });
        
        handleCancelInlineAdd();
      } else {
        throw new Error('Failed to add meal');
      }
    } catch (error) {
      console.error('Error adding meal:', error);
      toast({
        title: "Failed to add",
        description: "Could not add new meal option",
        variant: "destructive"
      });
    } finally {
      setIsSavingInlineMeal(false);
    }
  };
  
  // Bulk add meals
  const handleBulkAddMeals = async (sectionId: string) => {
    const sectionBulkMeals = bulkMeals[sectionId] || '';
    if (!sectionBulkMeals.trim()) return;
    
    setIsSavingInlineMeal(true);
    
    try {
      const section = deliverySections.find(s => s.id === sectionId);
      if (!section) return;
      
      // Parse the bulk input using shared utility
      const allMeals = parseBulkInput(sectionBulkMeals);
      
      // Get removeExisting setting for this section (default to true)
      const shouldRemoveExisting = removeExisting[sectionId] !== false;
      
      // Remove existing meals if removeExisting is true
      if (shouldRemoveExisting && section.day.options.length > 0) {
        for (const option of section.day.options) {
          try {
            await deleteMealOption(option.id);
          } catch (error) {
            console.error(`Error removing existing meal "${option.name}":`, error);
          }
        }
      }
      
      // Add each meal
      let successCount = 0;
      for (const mealName of allMeals) {
        try {
          const result = await addMealOption(
            section.day.day,
            section.day.weekOffset,
            {
              name: mealName,
              tags: [],
              active: true
            }
          );
          
          if (result) {
            successCount++;
          }
        } catch (error) {
          console.error(`Error adding meal "${mealName}":`, error);
        }
      }
      
      // Refresh data to show the new meals
      await fetchData();
      
      // Clear the bulk meals for this section
      setBulkMeals(prev => ({ ...prev, [sectionId]: '' }));
      
      toast({
        title: 'Success',
        description: `${shouldRemoveExisting ? 'Replaced with' : 'Added'} ${successCount} meal${successCount > 1 ? 's' : ''} to ${section.title}`,
      });
    } catch (error) {
      console.error('Error bulk adding meals:', error);
      toast({
        title: "Failed to add",
        description: "Could not add meals",
        variant: "destructive"
      });
    } finally {
      setIsSavingInlineMeal(false);
    }
  };
  
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
  
  // Function to send weekly menu update notifications with real-time progress
  const sendWeeklyMenuUpdateNotifications = async () => {
    setIsSendingNotifications(true);
    setShowNotificationDialog(false);
    setShowProgressDialog(true);
    
    // Reset progress state
    setNotificationProgress({
      totalUsers: 0,
      emailsSent: 0,
      emailsFailed: 0,
      currentBatch: 0,
      totalBatches: 0,
      progress: 0,
      logs: [],
      failedEmails: [],
      isComplete: false
    });
    
    try {
      const response = await fetch('/api/admin/notify-weekly-menu-update', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to start notification process');
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response body');
      }
      
      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const logEntry = {
                type: data.type,
                message: data.message,
                timestamp: new Date(),
                data: data.data
              };
              
              setNotificationProgress(prev => {
                const newLogs = [...prev.logs, logEntry];
                
                // Update progress based on message type
                let updates: any = { logs: newLogs };
                
                if (data.type === 'progress' && data.data?.totalUsers) {
                  updates.totalUsers = data.data.totalUsers;
                }
                
                if (data.type === 'batch_start' && data.data) {
                  updates.currentBatch = data.data.batchNumber;
                  updates.totalBatches = data.data.totalBatches;
                  updates.progress = data.data.progress || 0;
                }
                
                if (data.type === 'email_sent' && data.data) {
                  updates.emailsSent = data.data.totalSent;
                  updates.emailsFailed = data.data.totalFailed;
                }
                
                if (data.type === 'email_failed' && data.data) {
                  updates.emailsSent = data.data.totalSent;
                  updates.emailsFailed = data.data.totalFailed;
                  if (data.data.email && data.data.name && data.data.error) {
                    updates.failedEmails = [...prev.failedEmails, {
                      email: data.data.email,
                      name: data.data.name,
                      error: data.data.error
                    }];
                  }
                }
                
                if (data.type === 'batch_complete' && data.data) {
                  updates.progress = data.data.progress || 0;
                }
                
                if (data.type === 'complete') {
                  updates.isComplete = true;
                  updates.progress = 100;
                  if (data.data) {
                    updates.totalUsers = data.data.totalUsers || prev.totalUsers;
                    updates.emailsSent = data.data.emailsSent || prev.emailsSent;
                    updates.emailsFailed = data.data.emailsFailed || prev.emailsFailed;
                    if (data.data.failedEmails) {
                      updates.failedEmails = data.data.failedEmails;
                    }
                  }
                }
                
                if (data.type === 'error') {
                  updates.isComplete = true;
                  console.error('Notification error:', data.data);
                }
                
                return { ...prev, ...updates };
              });
              
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Error in notification stream:', error);
      setNotificationProgress(prev => ({
        ...prev,
        isComplete: true,
        logs: [...prev.logs, {
          type: 'error',
          message: `Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        }]
      }));
      
      toast({
        title: "Error",
        description: "Failed to send weekly menu update notifications",
        variant: "destructive"
      });
    } finally {
      setIsSendingNotifications(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with buttons */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Weekly Meal Box Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage Sunday and Tuesday deliveries across 3 weeks</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            <RefreshCcw className={`h-4 w-4 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => {
              setShowHistoryModal(true);
              fetchHistory();
            }}
            className="flex-1 sm:flex-none"
          >
            <History className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">View History</span>
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowNotificationDialog(true)}
            size="sm"
            className="flex-1 sm:flex-none border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <Mail className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Notify Users</span>
          </Button>
          <Button 
            variant="default"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
            onClick={rollForwardWeek}
            disabled={isRollingForward}
          >
            {isRollingForward ? (
              <>
                <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                <span className="hidden sm:inline">Rolling Forward...</span>
                <span className="sm:hidden">Rolling...</span>
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Roll Forward Week</span>
                <span className="sm:hidden">Roll</span>
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
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {deliverySections.map((section) => (
              <Card key={section.id} className={`border ${!section.day.active ? 'border-dashed opacity-70' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-base sm:text-lg">{section.title}</CardTitle>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <Input 
                          className="flex-1 sm:w-40 text-sm" 
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
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-md border gap-3 ${!option.active ? 'border-dashed opacity-70' : 'bg-muted/50'}`}
                      >
                        <div className="flex-1 min-w-0">
                          {/* Inline Chinese Name Edit */}
                          {editingChineseForMealId === option.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                autoFocus
                                placeholder="Enter Chinese name..."
                                value={inlineChineseName}
                                onChange={(e) => setInlineChineseName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleSaveInlineChinese(option.id)
                                  } else if (e.key === 'Escape') {
                                    handleCancelChineseEdit()
                                  }
                                }}
                                className="h-8 font-medium"
                              />
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleCancelChineseEdit}
                                className="h-8 px-2"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="font-medium truncate cursor-pointer hover:text-primary transition-colors" 
                              onDoubleClick={() => handleStartChineseEdit(option)}
                              title="Double-click to edit"
                            >
                              {option.name}
                            </div>
                          )}
                          
                          {/* Inline English Translation Edit */}
                          {editingEnglishForMealId === option.id ? (
                            <div className="mt-2 flex items-center gap-2">
                              <Input
                                autoFocus
                                placeholder="Enter English translation..."
                                value={inlineEnglishName}
                                onChange={(e) => setInlineEnglishName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleSaveInlineEnglish(option.id)
                                  } else if (e.key === 'Escape') {
                                    handleCancelEnglishEdit()
                                  }
                                }}
                                className="h-7 text-xs"
                              />
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleCancelEnglishEdit}
                                className="h-7 px-2"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <>
                              {option.nameEn && (
                                <div className="text-xs text-muted-foreground mt-1 italic">{option.nameEn}</div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1">
                                {option.tags?.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 justify-between sm:justify-end">
                          <div className="flex items-center gap-2">
                            <Switch 
                              id={`${option.id}-active`} 
                              checked={option.active} 
                              onCheckedChange={() => toggleMealActive(section.id, option.id)} 
                            />
                            <Label htmlFor={`${option.id}-active`} className="text-xs sm:hidden">
                              {option.active ? 'Active' : 'Inactive'}
                            </Label>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant={editingEnglishForMealId === option.id ? "default" : "ghost"} 
                              size="icon" 
                              onClick={() => handleStartEnglishEdit(option)} 
                              className="h-8 w-8"
                              title="Add/Edit English Translation"
                            >
                              <Languages className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEditMeal(option)} className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(option)} className="h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Inline Add Meal Input */}
                    {addingMealToSection === section.id ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-md border border-primary bg-primary/5">
                        <Input
                          autoFocus
                          placeholder="Enter meal name and press Enter..."
                          value={newInlineMealName}
                          onChange={(e) => setNewInlineMealName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveInlineMeal(section.id);
                            } else if (e.key === 'Escape') {
                              handleCancelInlineAdd();
                            }
                          }}
                          disabled={isSavingInlineMeal}
                          className="flex-1"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSaveInlineMeal(section.id)}
                            disabled={isSavingInlineMeal || !newInlineMealName.trim()}
                            className="flex-1 sm:flex-none"
                          >
                            {isSavingInlineMeal ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="h-4 w-4 sm:mr-1" />
                                <span className="hidden sm:inline">Save</span>
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelInlineAdd}
                            disabled={isSavingInlineMeal}
                            className="flex-1 sm:flex-none"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full mt-2" 
                        onClick={() => handleAddMealClick(section.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Meal Option
                      </Button>
                    )}
                    
                    {/* Bulk Add Meals Section */}
                    <div className="pt-3 border-t mt-4">
                      <Label className="text-sm font-semibold mb-2 block">Bulk Add Meals</Label>
                      <p className="text-xs text-muted-foreground mb-2">Paste multiple meals (tab, comma, or newline separated)</p>
                      <textarea
                        placeholder="e.g. Grilled Chicken with Veggies&#9;Pasta Carbonara&#9;Salmon with Rice"
                        value={bulkMeals[section.id] || ''}
                        onChange={(e) => setBulkMeals(prev => ({ ...prev, [section.id]: e.target.value }))}
                        className="w-full h-20 px-3 py-2 text-sm border rounded-md focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <div className="flex items-center space-x-2 mt-2">
                        <Switch 
                          id={`remove-existing-${section.id}`}
                          checked={removeExisting[section.id] !== false}
                          onCheckedChange={(checked) => setRemoveExisting(prev => ({ ...prev, [section.id]: checked }))}
                        />
                        <Label htmlFor={`remove-existing-${section.id}`} className="text-xs cursor-pointer">
                          Remove existing meals before adding
                        </Label>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => handleBulkAddMeals(section.id)}
                        disabled={!(bulkMeals[section.id] || '').trim() || isSavingInlineMeal}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {removeExisting[section.id] !== false ? 'Replace All Meals' : 'Add All Meals'}
                      </Button>
                    </div>
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
      
      <WeeklyMenuEditDialog
        editingMeal={editingMeal}
        onOpenChange={setEditDialogOpen}
        onRemoveTag={(index) => {
          if (!editingMeal) {
            return
          }

          const newTags = [...(editingMeal.tags || [])]
          newTags.splice(index, 1)
          setEditingMeal({ ...editingMeal, tags: newTags })
        }}
        onSave={handleSaveMeal}
        onUpdateMeal={setEditingMeal}
        open={editDialogOpen}
      />
      
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
      
      <WeeklyMenuHistoryDialog
        deletingHistoryId={deletingHistoryId}
        handleDeleteHistory={handleDeleteHistory}
        historyData={historyData}
        isLoadingHistory={isLoadingHistory}
        onOpenChange={setShowHistoryModal}
        open={showHistoryModal}
        selectedHistoryEntry={selectedHistoryEntry}
        setSelectedHistoryEntry={setSelectedHistoryEntry}
      />
      
      <WeeklyMenuNotificationDialogs
        isSendingNotifications={isSendingNotifications}
        notificationProgress={notificationProgress}
        onCloseNotificationDialog={() => setShowNotificationDialog(false)}
        onCloseProgressDialog={() => setShowProgressDialog(false)}
        onOpenNotificationDialogChange={setShowNotificationDialog}
        onOpenProgressDialogChange={(open) => {
          if (!open && notificationProgress.isComplete) {
            setShowProgressDialog(false)
          }
        }}
        onSendNotifications={sendWeeklyMenuUpdateNotifications}
        showNotificationDialog={showNotificationDialog}
        showProgressDialog={showProgressDialog}
      />
    </div>
  )
}