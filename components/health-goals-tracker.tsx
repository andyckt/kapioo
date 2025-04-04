"use client"

import { useState } from "react"
import {
  Target,
  Calendar,
  Activity,
  Dna,
  Award,
  Plus,
  Edit,
  Trash2,
  Check,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function HealthGoalsTracker() {
  const [activeTab, setActiveTab] = useState("active")
  const [showAddGoalDialog, setShowAddGoalDialog] = useState(false)
  const [showEditGoalDialog, setShowEditGoalDialog] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [newGoalData, setNewGoalData] = useState({
    title: "",
    category: "fitness",
    targetValue: "",
    targetUnit: "",
    deadline: "",
    currentValue: "",
  })
  const { toast } = useToast()

  // Mock active goals
  const [activeGoals, setActiveGoals] = useState([
    {
      id: 1,
      title: "Reduce Body Fat",
      category: "fitness",
      icon: <Activity className="h-4 w-4" />,
      currentValue: 18,
      targetValue: 15,
      unit: "%",
      startDate: "2025-03-01",
      deadline: "2025-06-01",
      progress: 33,
      trend: "down",
      checkIns: [
        { date: "2025-03-01", value: 20 },
        { date: "2025-03-15", value: 19 },
        { date: "2025-04-01", value: 18 },
      ],
    },
    {
      id: 2,
      title: "Increase Protein Intake",
      category: "nutrition",
      icon: <Dna className="h-4 w-4" />,
      currentValue: 100,
      targetValue: 120,
      unit: "g/day",
      startDate: "2025-03-15",
      deadline: "2025-05-15",
      progress: 50,
      trend: "up",
      checkIns: [
        { date: "2025-03-15", value: 80 },
        { date: "2025-04-01", value: 90 },
        { date: "2025-04-15", value: 100 },
      ],
    },
  ])

  // Mock completed goals
  const [completedGoals, setCompletedGoals] = useState([
    {
      id: 3,
      title: "Run 5K",
      category: "fitness",
      icon: <Activity className="h-4 w-4" />,
      targetValue: 5,
      unit: "km",
      completedDate: "2025-02-15",
      achieved: true,
    },
    {
      id: 4,
      title: "Drink More Water",
      category: "wellness",
      icon: <Dna className="h-4 w-4" />,
      targetValue: 2.5,
      unit: "L/day",
      completedDate: "2025-01-30",
      achieved: true,
    },
  ])

  const handleAddGoal = () => {
    if (!newGoalData.title || !newGoalData.targetValue || !newGoalData.deadline) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    const newGoal = {
      id: Date.now(),
      title: newGoalData.title,
      category: newGoalData.category,
      icon:
        newGoalData.category === "fitness" ? (
          <Activity className="h-4 w-4" />
        ) : newGoalData.category === "nutrition" ? (
          <Dna className="h-4 w-4" />
        ) : (
          <Target className="h-4 w-4" />
        ),
      currentValue: Number.parseFloat(newGoalData.currentValue) || 0,
      targetValue: Number.parseFloat(newGoalData.targetValue),
      unit: newGoalData.targetUnit,
      startDate: new Date().toISOString().split("T")[0],
      deadline: newGoalData.deadline,
      progress: 0,
      trend: "neutral",
      checkIns: [
        { date: new Date().toISOString().split("T")[0], value: Number.parseFloat(newGoalData.currentValue) || 0 },
      ],
    }

    setActiveGoals([...activeGoals, newGoal])
    setNewGoalData({
      title: "",
      category: "fitness",
      targetValue: "",
      targetUnit: "",
      deadline: "",
      currentValue: "",
    })
    setShowAddGoalDialog(false)

    toast({
      title: "Goal added",
      description: "Your new health goal has been created",
    })
  }

  const handleUpdateGoal = () => {
    if (!selectedGoal) return

    const updatedGoals = activeGoals.map((goal) =>
      goal.id === selectedGoal.id
        ? {
            ...goal,
            title: newGoalData.title || goal.title,
            targetValue: Number.parseFloat(newGoalData.targetValue) || goal.targetValue,
            unit: newGoalData.targetUnit || goal.unit,
            deadline: newGoalData.deadline || goal.deadline,
          }
        : goal,
    )

    setActiveGoals(updatedGoals)
    setShowEditGoalDialog(false)

    toast({
      title: "Goal updated",
      description: "Your health goal has been updated",
    })
  }

  const handleDeleteGoal = (goalId) => {
    setActiveGoals(activeGoals.filter((goal) => goal.id !== goalId))

    toast({
      title: "Goal deleted",
      description: "Your health goal has been removed",
    })
  }

  const handleCompleteGoal = (goal) => {
    // Remove from active goals
    setActiveGoals(activeGoals.filter((g) => g.id !== goal.id))

    // Add to completed goals
    const completedGoal = {
      ...goal,
      completedDate: new Date().toISOString().split("T")[0],
      achieved: goal.currentValue >= goal.targetValue,
    }

    setCompletedGoals([completedGoal, ...completedGoals])

    toast({
      title: "Goal completed",
      description: `Congratulations on completing your ${goal.title} goal!`,
    })
  }

  const handleCheckIn = (goalId, newValue) => {
    const updatedGoals = activeGoals.map((goal) => {
      if (goal.id === goalId) {
        const checkIns = [
          ...goal.checkIns,
          { date: new Date().toISOString().split("T")[0], value: Number.parseFloat(newValue) },
        ]

        // Calculate progress
        let progress = 0
        if (goal.targetValue > goal.checkIns[0].value) {
          // Goal is to increase
          progress = Math.min(
            100,
            Math.max(0, ((newValue - goal.checkIns[0].value) / (goal.targetValue - goal.checkIns[0].value)) * 100),
          )
        } else {
          // Goal is to decrease
          progress = Math.min(
            100,
            Math.max(0, ((goal.checkIns[0].value - newValue) / (goal.checkIns[0].value - goal.targetValue)) * 100),
          )
        }

        // Determine trend
        const trend =
          checkIns.length > 1
            ? newValue > checkIns[checkIns.length - 2].value
              ? "up"
              : newValue < checkIns[checkIns.length - 2].value
                ? "down"
                : "neutral"
            : "neutral"

        return {
          ...goal,
          currentValue: Number.parseFloat(newValue),
          checkIns,
          progress: Math.round(progress),
          trend,
        }
      }
      return goal
    })

    setActiveGoals(updatedGoals)

    toast({
      title: "Check-in recorded",
      description: "Your progress has been updated",
    })
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case "fitness":
        return <Activity className="h-5 w-5" />
      case "nutrition":
        return <Dna className="h-5 w-5" />
      case "wellness":
        return <Target className="h-5 w-5" />
      default:
        return <Target className="h-5 w-5" />
    }
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Health Goals</CardTitle>
              <CardDescription>Track and manage your health and fitness goals</CardDescription>
            </div>
          </div>
          <Dialog open={showAddGoalDialog} onOpenChange={setShowAddGoalDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Health Goal</DialogTitle>
                <DialogDescription>Set a specific, measurable goal with a deadline</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-title">Goal Title</Label>
                  <Input
                    id="goal-title"
                    placeholder="e.g., Reduce Body Fat, Increase Protein Intake"
                    value={newGoalData.title}
                    onChange={(e) => setNewGoalData({ ...newGoalData, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="goal-category">Category</Label>
                    <Select
                      value={newGoalData.category}
                      onValueChange={(value) => setNewGoalData({ ...newGoalData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fitness">Fitness</SelectItem>
                        <SelectItem value="nutrition">Nutrition</SelectItem>
                        <SelectItem value="wellness">Wellness</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="goal-deadline">Target Date</Label>
                    <Input
                      id="goal-deadline"
                      type="date"
                      value={newGoalData.deadline}
                      onChange={(e) => setNewGoalData({ ...newGoalData, deadline: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="goal-current">Current Value</Label>
                    <Input
                      id="goal-current"
                      type="number"
                      placeholder="0"
                      value={newGoalData.currentValue}
                      onChange={(e) => setNewGoalData({ ...newGoalData, currentValue: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="goal-target">Target Value</Label>
                    <Input
                      id="goal-target"
                      type="number"
                      placeholder="0"
                      value={newGoalData.targetValue}
                      onChange={(e) => setNewGoalData({ ...newGoalData, targetValue: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="goal-unit">Unit</Label>
                    <Input
                      id="goal-unit"
                      placeholder="kg, %, g/day"
                      value={newGoalData.targetUnit}
                      onChange={(e) => setNewGoalData({ ...newGoalData, targetUnit: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddGoalDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddGoal}>Add Goal</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Active Goals</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-4">
            {activeGoals.length > 0 ? (
              <div className="space-y-4">
                {activeGoals.map((goal) => (
                  <Card key={goal.id}>
                    <CardContent className="p-0">
                      <div className="p-4 border-b">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-2 rounded-full">{goal.icon}</div>
                            <div>
                              <h3 className="font-medium">{goal.title}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>
                                  Target: {goal.targetValue} {goal.unit}
                                </span>
                                <span>•</span>
                                <Calendar className="h-3 w-3" />
                                <span>Due: {new Date(goal.deadline).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  Check In
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Record Progress</DialogTitle>
                                  <DialogDescription>Update your current value for {goal.title}</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="current-value">Current Value ({goal.unit})</Label>
                                    <Input id="current-value" type="number" defaultValue={goal.currentValue} />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => {}}>
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={(e) => {
                                      const input = e.target.closest('div[role="dialog"]').querySelector("input")
                                      handleCheckIn(goal.id, input.value)
                                    }}
                                  >
                                    Save Progress
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            <div className="flex">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setSelectedGoal(goal)
                                  setNewGoalData({
                                    title: goal.title,
                                    category: goal.category,
                                    targetValue: goal.targetValue.toString(),
                                    targetUnit: goal.unit,
                                    deadline: goal.deadline,
                                    currentValue: goal.currentValue.toString(),
                                  })
                                  setShowEditGoalDialog(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteGoal(goal.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span>Progress</span>
                              <Badge variant="outline" className="flex items-center gap-1">
                                {getTrendIcon(goal.trend)}
                                <span>
                                  {goal.currentValue} {goal.unit}
                                </span>
                              </Badge>
                            </div>
                            <span>{goal.progress}%</span>
                          </div>
                          <Progress value={goal.progress} className="h-2" />
                        </div>

                        <div className="mt-4 flex justify-end">
                          <Button variant="outline" size="sm" onClick={() => handleCompleteGoal(goal)}>
                            <Check className="h-4 w-4 mr-2" />
                            Mark as Complete
                          </Button>
                        </div>
                      </div>

                      <div className="p-4">
                        <h4 className="text-sm font-medium mb-2">Check-in History</h4>
                        <div className="space-y-2">
                          {goal.checkIns
                            .slice()
                            .reverse()
                            .map((checkIn, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span>{new Date(checkIn.date).toLocaleDateString()}</span>
                                <Badge variant="outline">
                                  {checkIn.value} {goal.unit}
                                </Badge>
                              </div>
                            ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <Target className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No active goals</h3>
                  <p className="text-sm text-muted-foreground mt-1">Create a new health goal to get started</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4 space-y-4">
            {completedGoals.length > 0 ? (
              <div className="space-y-3">
                {completedGoals.map((goal) => (
                  <div key={goal.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${goal.achieved ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-muted"}`}
                      >
                        {goal.icon}
                      </div>
                      <div>
                        <h3 className="font-medium">{goal.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            Target: {goal.targetValue} {goal.unit}
                          </span>
                          <span>•</span>
                          <span>Completed: {new Date(goal.completedDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={goal.achieved ? "default" : "outline"}
                      className={goal.achieved ? "bg-green-600" : ""}
                    >
                      {goal.achieved ? "Achieved" : "Completed"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <Award className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No completed goals</h3>
                  <p className="text-sm text-muted-foreground mt-1">Complete goals to see them here</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          Setting specific, measurable goals increases success rate by 70%
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </CardFooter>

      <Dialog open={showEditGoalDialog} onOpenChange={setShowEditGoalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Health Goal</DialogTitle>
            <DialogDescription>Update your goal details</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-goal-title">Goal Title</Label>
              <Input
                id="edit-goal-title"
                value={newGoalData.title}
                onChange={(e) => setNewGoalData({ ...newGoalData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-goal-target">Target Value</Label>
                <Input
                  id="edit-goal-target"
                  type="number"
                  value={newGoalData.targetValue}
                  onChange={(e) => setNewGoalData({ ...newGoalData, targetValue: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-goal-unit">Unit</Label>
                <Input
                  id="edit-goal-unit"
                  value={newGoalData.targetUnit}
                  onChange={(e) => setNewGoalData({ ...newGoalData, targetUnit: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-goal-deadline">Target Date</Label>
              <Input
                id="edit-goal-deadline"
                type="date"
                value={newGoalData.deadline}
                onChange={(e) => setNewGoalData({ ...newGoalData, deadline: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditGoalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateGoal}>Update Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

