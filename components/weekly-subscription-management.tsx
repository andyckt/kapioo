"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Calendar, Edit, Plus, Trash2, Loader2, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  
  // Fetch delivery sections from API
  useEffect(() => {
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

    fetchData();
  }, [])
  
  // No date calculation functions needed with fixed dates
  
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
    </div>
  )
}