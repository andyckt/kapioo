"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Calendar, Edit, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

// Type definitions for meal options and delivery days
type MealOption = {
  id: string
  name: string
  description?: string
  tags?: string[]
  active: boolean
}

type DeliveryDay = {
  id: 'sunday' | 'tuesday'
  name: string
  date: string
  active: boolean
  options: MealOption[]
}

type DeliverySection = {
  id: string
  title: string
  day: DeliveryDay
}

export function WeeklySubscriptionManagement() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [deliverySections, setDeliverySections] = useState<DeliverySection[]>([])
  const [editingMeal, setEditingMeal] = useState<MealOption | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addMealDialogOpen, setAddMealDialogOpen] = useState(false)
  const [newMealSection, setNewMealSection] = useState<string>('')
  const [newMeal, setNewMeal] = useState<Partial<MealOption>>({ name: '', description: '', tags: [], active: true })
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [mealToDelete, setMealToDelete] = useState<MealOption | null>(null)
  
  // Initialize with mock data
  useEffect(() => {
    // Create mock delivery sections
    setDeliverySections([
      {
        id: 'current-sunday',
        title: 'This Week Sunday Delivery',
        day: {
          id: 'sunday',
          name: 'Sunday Delivery',
          date: 'Sep 07',
          active: true,
          options: [
            {
              id: 'sunday-option1',
              name: '鲜虾鸡翅焖煲 + 紫米饭 + 蘑菇青菜',
              description: 'Fresh shrimp and chicken stew with purple rice and mushroom vegetables',
              tags: ['High Protein', 'Low Carb'],
              active: true
            },
            {
              id: 'sunday-option2',
              name: '罗勒青酱意面 + 意式香草烤鸡',
              description: 'Basil pesto pasta with Italian herb roasted chicken',
              tags: ['Italian', 'Herb'],
              active: true
            },
            {
              id: 'sunday-option3',
              name: '桂侯萝卜慢炖牛腋 + 紫米饭 + 蔑油菜心',
              description: 'Slow-cooked beef brisket with radish, purple rice and vegetable',
              tags: ['Slow Cooked', 'Beef'],
              active: true
            }
          ]
        }
      },
      {
        id: 'current-tuesday',
        title: 'This Week Tuesday Delivery',
        day: {
          id: 'tuesday',
          name: 'Tuesday Delivery',
          date: 'Sep 09',
          active: true,
          options: [
            {
              id: 'tuesday-option1',
              name: '豌豆/爆炒牛肉粒 + 玉米饭 + 时蔬',
              description: 'Stir-fried beef with peas, corn rice and seasonal vegetables',
              tags: ['Beef', 'Stir Fry'],
              active: true
            },
            {
              id: 'tuesday-option2',
              name: '西班牙浓郁海鲜烩饭',
              description: 'Spanish seafood paella',
              tags: ['Seafood', 'Spanish'],
              active: true
            },
            {
              id: 'tuesday-option3',
              name: '泰式柠檬干煎鸡 + 清炒黄瓜条',
              description: 'Thai lemon grilled chicken with stir-fried cucumber',
              tags: ['Thai', 'Chicken'],
              active: true
            }
          ]
        }
      },
      {
        id: 'next-sunday',
        title: 'Next Week Sunday Delivery',
        day: {
          id: 'sunday',
          name: 'Sunday Delivery',
          date: 'Sep 14',
          active: true,
          options: [
            {
              id: 'next-sunday-option1',
              name: '香煎三文鱼 + 藜麦饭 + 芦笋',
              description: 'Pan-seared salmon with quinoa and asparagus',
              tags: ['Seafood', 'High Protein'],
              active: true
            },
            {
              id: 'next-sunday-option2',
              name: '日式照烧鸡腿 + 糙米饭 + 炒菠菜',
              description: 'Japanese teriyaki chicken thigh with brown rice and stir-fried spinach',
              tags: ['Japanese', 'Chicken'],
              active: true
            },
            {
              id: 'next-sunday-option3',
              name: '意式肉酱面 + 帕玛森奶酪 + 烤蔬菜',
              description: 'Italian meat sauce pasta with parmesan cheese and roasted vegetables',
              tags: ['Italian', 'Pasta'],
              active: true
            }
          ]
        }
      },
      {
        id: 'next-tuesday',
        title: 'Next Week Tuesday Delivery',
        day: {
          id: 'tuesday',
          name: 'Tuesday Delivery',
          date: 'Sep 16',
          active: true,
          options: [
            {
              id: 'next-tuesday-option1',
              name: '泰式青咖喱鸡 + 香米饭 + 炒青菜',
              description: 'Thai green curry chicken with jasmine rice and stir-fried greens',
              tags: ['Thai', 'Spicy'],
              active: true
            },
            {
              id: 'next-tuesday-option2',
              name: '红烧牛肉面 + 清炒西兰花',
              description: 'Braised beef noodle soup with stir-fried broccoli',
              tags: ['Beef', 'Noodles'],
              active: true
            },
            {
              id: 'next-tuesday-option3',
              name: '墨西哥牛肉卷 + 鳄梨酱 + 炸玉米片',
              description: 'Mexican beef burrito with guacamole and tortilla chips',
              tags: ['Mexican', 'Beef'],
              active: true
            }
          ]
        }
      }
    ])
    
    setIsLoading(false)
  }, [])
  
  // No date calculation functions needed with fixed dates
  
  // Toggle day active status
  const toggleDayActive = (sectionId: string) => {
    setDeliverySections(sections => 
      sections.map(section => 
        section.id === sectionId 
          ? { ...section, day: { ...section.day, active: !section.day.active } } 
          : section
      )
    )
  }
  
  // Toggle meal option active status
  const toggleMealActive = (sectionId: string, mealId: string) => {
    setDeliverySections(sections => 
      sections.map(section => 
        section.id === sectionId 
          ? {
              ...section,
              day: {
                ...section.day,
                options: section.day.options.map(option => 
                  option.id === mealId 
                    ? { ...option, active: !option.active }
                    : option
                )
              }
            }
          : section
      )
    )
  }
  
  // Open edit dialog for a meal
  const handleEditMeal = (meal: MealOption) => {
    setEditingMeal({ ...meal })
    setEditDialogOpen(true)
  }
  
  // Save edited meal
  const handleSaveMeal = () => {
    if (!editingMeal) return
    
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
    )
    
    setEditDialogOpen(false)
    toast({
      title: "Meal updated",
      description: "The meal option has been updated successfully."
    })
  }
  
  // Open delete confirmation dialog
  const handleDeleteClick = (meal: MealOption) => {
    setMealToDelete(meal)
    setConfirmDeleteOpen(true)
  }
  
  // Confirm delete meal
  const handleConfirmDelete = () => {
    if (!mealToDelete) return
    
    setDeliverySections(sections => 
      sections.map(section => ({
        ...section,
        day: {
          ...section.day,
          options: section.day.options.filter(option => option.id !== mealToDelete.id)
        }
      }))
    )
    
    setConfirmDeleteOpen(false)
    toast({
      title: "Meal deleted",
      description: "The meal option has been deleted successfully."
    })
  }
  
  // Open add meal dialog
  const handleAddMealClick = (sectionId: string) => {
    setNewMealSection(sectionId)
    setNewMeal({
      name: "",
      description: "",
      tags: [],
      active: true
    })
    setAddMealDialogOpen(true)
  }
  
  // Add new meal option after form submission
  const handleAddMealSubmit = () => {
    if (!newMealSection || !newMeal.name) return
    
    const mealToAdd: MealOption = {
      id: `${newMealSection}-option${Date.now()}`,
      name: newMeal.name,
      description: newMeal.description || "",
      tags: newMeal.tags || [],
      active: newMeal.active !== undefined ? newMeal.active : true
    }
    
    setDeliverySections(sections => 
      sections.map(section => 
        section.id === newMealSection 
          ? { 
              ...section, 
              day: {
                ...section.day,
                options: [...section.day.options, mealToAdd]
              }
            } 
          : section
      )
    )
    
    setAddMealDialogOpen(false)
    toast({
      title: "Meal added",
      description: "The new meal option has been added successfully."
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-[300px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="meal-description" className="text-right">
                  Description
                </Label>
                <Input
                  id="meal-description"
                  value={editingMeal.description || ''}
                  onChange={(e) => setEditingMeal({...editingMeal, description: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="meal-tags" className="text-right">
                  Tags
                </Label>
                <Input
                  id="meal-tags"
                  value={editingMeal.tags?.join(', ') || ''}
                  onChange={(e) => setEditingMeal({
                    ...editingMeal, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                  })}
                  placeholder="Enter tags separated by commas"
                  className="col-span-3"
                />
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-meal-description" className="text-right">
                Description
              </Label>
              <Input
                id="new-meal-description"
                value={newMeal.description || ''}
                onChange={(e) => setNewMeal({...newMeal, description: e.target.value})}
                className="col-span-3"
                placeholder="Enter meal description"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-meal-tags" className="text-right">
                Tags
              </Label>
              <Input
                id="new-meal-tags"
                value={newMeal.tags?.join(', ') || ''}
                onChange={(e) => setNewMeal({
                  ...newMeal, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                })}
                placeholder="Enter tags separated by commas"
                className="col-span-3"
              />
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