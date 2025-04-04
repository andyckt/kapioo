"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Calendar, ChevronLeft, ChevronRight, Plus, X, Save, Trash2, Copy } from "lucide-react"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAvailableMeals } from "@/lib/utils"

export function MealPlanner() {
  const [currentWeek, setCurrentWeek] = useState(0)
  const [selectedDay, setSelectedDay] = useState(null)
  const [showMealSelector, setShowMealSelector] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()

  // Sample meal plan data
  const [mealPlan, setMealPlan] = useState({
    monday: [
      {
        id: "m1",
        name: "Grilled Salmon with Vegetables",
        type: "dinner",
        image: "/placeholder.svg?height=60&width=60",
      },
    ],
    tuesday: [
      { id: "m2", name: "Chicken Alfredo Pasta", type: "dinner", image: "/placeholder.svg?height=60&width=60" },
    ],
    wednesday: [
      { id: "m3", name: "Vegetable Curry with Naan", type: "dinner", image: "/placeholder.svg?height=60&width=60" },
    ],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  })

  // Available meals from our utility function
  const availableMeals = getAvailableMeals().map((meal, index) => ({
    ...meal,
    id: `am${index + 1}`,
    type: meal.tags && meal.tags.includes("Breakfast") ? "breakfast" : "dinner",
  }))

  const filteredMeals = availableMeals.filter(
    (meal) =>
      meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meal.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  const mealTypes = ["breakfast", "lunch", "dinner", "snack"]

  const handlePrevWeek = () => {
    if (currentWeek > 0) {
      setCurrentWeek(currentWeek - 1)
    }
  }

  const handleNextWeek = () => {
    setCurrentWeek(currentWeek + 1)
  }

  const getWeekDates = () => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + currentWeek * 7) // Monday of current week

    return days.map((day, index) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + index)
      return {
        day,
        date: date.getDate(),
        month: date.toLocaleString("default", { month: "short" }),
        isToday: date.toDateString() === today.toDateString(),
      }
    })
  }

  const weekDates = getWeekDates()

  const handleAddMeal = (meal) => {
    if (!selectedDay) return

    const newMeal = { ...meal, id: `${meal.id}-${Date.now()}` } // Create a new ID to avoid conflicts

    setMealPlan({
      ...mealPlan,
      [selectedDay]: [...(mealPlan[selectedDay] || []), newMeal],
    })

    toast({
      title: "Meal added",
      description: `${meal.name} added to ${selectedDay}`,
    })

    setShowMealSelector(false)
  }

  const handleRemoveMeal = (day, mealId) => {
    setMealPlan({
      ...mealPlan,
      [day]: mealPlan[day].filter((meal) => meal.id !== mealId),
    })

    toast({
      title: "Meal removed",
      description: "Meal removed from your plan",
    })
  }

  const handleDragEnd = (result) => {
    if (!result.destination) return

    const { source, destination } = result

    // If dropped in the same list
    if (source.droppableId === destination.droppableId) {
      const day = source.droppableId
      const items = Array.from(mealPlan[day])
      const [reorderedItem] = items.splice(source.index, 1)
      items.splice(destination.index, 0, reorderedItem)

      setMealPlan({
        ...mealPlan,
        [day]: items,
      })
    } else {
      // If dropped in a different list
      const sourceDay = source.droppableId
      const destDay = destination.droppableId
      const sourceItems = Array.from(mealPlan[sourceDay])
      const destItems = Array.from(mealPlan[destDay] || [])
      const [movedItem] = sourceItems.splice(source.index, 1)
      destItems.splice(destination.index, 0, movedItem)

      setMealPlan({
        ...mealPlan,
        [sourceDay]: sourceItems,
        [destDay]: destItems,
      })
    }
  }

  const handleSavePlan = () => {
    toast({
      title: "Meal plan saved",
      description: "Your meal plan has been saved successfully",
    })
  }

  const handleClearDay = (day) => {
    setMealPlan({
      ...mealPlan,
      [day]: [],
    })

    toast({
      title: "Day cleared",
      description: `All meals for ${day} have been removed`,
    })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Meal Planner
            </CardTitle>
            <CardDescription>Plan your meals for the week</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={handlePrevWeek} disabled={currentWeek === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{currentWeek === 0 ? "This Week" : `Week ${currentWeek + 1}`}</span>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((dateInfo) => (
              <div key={dateInfo.day} className="flex flex-col">
                <div
                  className={`text-center p-2 rounded-t-md ${dateInfo.isToday ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  <div className="text-xs font-medium capitalize">{dateInfo.day.substring(0, 3)}</div>
                  <div className="text-sm font-bold">
                    {dateInfo.date} {dateInfo.month}
                  </div>
                </div>

                <Droppable droppableId={dateInfo.day}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 min-h-[200px] p-2 border rounded-b-md ${
                        snapshot.isDraggingOver ? "bg-primary/5" : "bg-background"
                      }`}
                    >
                      {mealPlan[dateInfo.day]?.map((meal, index) => (
                        <Draggable key={meal.id} draggableId={meal.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="mb-2 p-2 bg-card rounded-md border shadow-sm"
                            >
                              <div className="flex items-center gap-2">
                                <img
                                  src={meal.image || "/placeholder.svg"}
                                  alt={meal.name}
                                  className="h-8 w-8 rounded-md object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{meal.name}</p>
                                  <Badge variant="outline" className="text-[10px] capitalize">
                                    {meal.type}
                                  </Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleRemoveMeal(dateInfo.day, meal.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      <div className="flex justify-center mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-8 border border-dashed"
                          onClick={() => {
                            setSelectedDay(dateInfo.day)
                            setShowMealSelector(true)
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          <span className="text-xs">Add Meal</span>
                        </Button>
                      </div>

                      {mealPlan[dateInfo.day]?.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-6 text-xs text-muted-foreground hover:text-destructive mt-1"
                          onClick={() => handleClearDay(dateInfo.day)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Clear Day
                        </Button>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>

        <Dialog open={showMealSelector} onOpenChange={setShowMealSelector}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                Add Meal to {selectedDay && selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}
              </DialogTitle>
              <DialogDescription>Search for meals or browse by category</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Input
                placeholder="Search meals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <Tabs defaultValue="all">
                <TabsList className="grid grid-cols-5">
                  <TabsTrigger value="all">All</TabsTrigger>
                  {mealTypes.map((type) => (
                    <TabsTrigger key={type} value={type} className="capitalize">
                      {type}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="all" className="max-h-[300px] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {filteredMeals.map((meal) => (
                      <motion.div
                        key={meal.id}
                        whileHover={{ scale: 1.02 }}
                        className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-muted"
                        onClick={() => handleAddMeal(meal)}
                      >
                        <img
                          src={meal.image || "/placeholder.svg"}
                          alt={meal.name}
                          className="h-10 w-10 rounded-md object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{meal.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {meal.type}
                            </Badge>
                            {meal.tags.slice(0, 1).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[10px]">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>

                {mealTypes.map((type) => (
                  <TabsContent key={type} value={type} className="max-h-[300px] overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {filteredMeals
                        .filter((meal) => meal.type === type)
                        .map((meal) => (
                          <motion.div
                            key={meal.id}
                            whileHover={{ scale: 1.02 }}
                            className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-muted"
                            onClick={() => handleAddMeal(meal)}
                          >
                            <img
                              src={meal.image || "/placeholder.svg"}
                              alt={meal.name}
                              className="h-10 w-10 rounded-md object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{meal.name}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {meal.tags.slice(0, 2).map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-[10px]">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </motion.div>
                        ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMealSelector(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(mealPlan, null, 2))
            toast({
              title: "Copied to clipboard",
              description: "Your meal plan has been copied to clipboard",
            })
          }}
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy Plan
        </Button>
        <Button onClick={handleSavePlan}>
          <Save className="h-4 w-4 mr-2" />
          Save Plan
        </Button>
      </CardFooter>
    </Card>
  )
}

