"use client"

import { useState } from "react"
import {
  Brain,
  MessageSquare,
  Send,
  ArrowRight,
  Dna,
  Activity,
  Clipboard,
  BarChart2,
  Calendar,
  Zap,
  Sparkles,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
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

export function PersonalizedNutritionCoach() {
  const [activeTab, setActiveTab] = useState("chat")
  const [messages, setMessages] = useState([
    {
      id: 1,
      content: "Hi there! I'm your personal nutrition coach. How can I help you today?",
      sender: "bot",
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [showGoalDialog, setShowGoalDialog] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const { toast } = useToast()

  // Mock user health data
  const healthData = {
    weight: 165,
    height: "5'10\"",
    bmi: 23.7,
    bodyFat: 18,
    basalMetabolicRate: 1650,
    activityLevel: "Moderate",
    dailyCalories: 2200,
    macroSplit: {
      protein: 30,
      carbs: 45,
      fat: 25,
    },
    recentMeals: [
      { name: "Grilled Salmon Bowl", calories: 520, protein: 32, carbs: 45, fat: 22, date: "Yesterday" },
      { name: "Chicken Teriyaki Plate", calories: 480, protein: 35, carbs: 50, fat: 15, date: "Yesterday" },
      { name: "Mediterranean Veggie Bowl", calories: 450, protein: 18, carbs: 60, fat: 20, date: "2 days ago" },
    ],
  }

  // Mock health goals
  const healthGoals = [
    {
      id: 1,
      title: "Weight Management",
      description: "Maintain a healthy weight through balanced nutrition",
      icon: <Activity className="h-5 w-5" />,
      options: [
        { id: "weight-loss", name: "Weight Loss", description: "Reduce body weight gradually" },
        { id: "weight-maintain", name: "Weight Maintenance", description: "Maintain current weight" },
        { id: "weight-gain", name: "Weight Gain", description: "Healthy weight gain" },
      ],
    },
    {
      id: 2,
      title: "Fitness Performance",
      description: "Optimize nutrition for your fitness goals",
      icon: <Zap className="h-5 w-5" />,
      options: [
        { id: "muscle-gain", name: "Muscle Gain", description: "Support muscle growth and recovery" },
        { id: "endurance", name: "Endurance", description: "Fuel for endurance activities" },
        { id: "athletic", name: "Athletic Performance", description: "Overall athletic improvement" },
      ],
    },
    {
      id: 3,
      title: "Health Management",
      description: "Support specific health conditions with nutrition",
      icon: <Dna className="h-5 w-5" />,
      options: [
        { id: "heart-health", name: "Heart Health", description: "Support cardiovascular health" },
        { id: "blood-sugar", name: "Blood Sugar Management", description: "Stabilize blood glucose levels" },
        { id: "digestive", name: "Digestive Health", description: "Improve gut health and digestion" },
      ],
    },
  ]

  // Mock nutrition plan
  const [nutritionPlan, setNutritionPlan] = useState(null)

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      content: inputValue,
      sender: "user",
      timestamp: new Date().toISOString(),
    }

    setMessages([...messages, userMessage])
    setInputValue("")
    setIsTyping(true)

    // Simulate bot response
    setTimeout(() => {
      let botResponse = ""

      // Simple keyword-based responses
      const input = inputValue.toLowerCase()

      if (input.includes("hello") || input.includes("hi") || input.includes("hey")) {
        botResponse = "Hello! How can I help with your nutrition goals today?"
      } else if (input.includes("goal") || input.includes("plan")) {
        botResponse =
          "I can help you set nutrition goals and create a personalized plan. Would you like to explore our goal options? Just click on the 'Goals & Plans' tab."
      } else if (input.includes("calorie") || input.includes("calories")) {
        botResponse = `Based on your profile, your estimated daily calorie need is ${healthData.dailyCalories} calories. This is calculated from your basal metabolic rate of ${healthData.basalMetabolicRate} calories and your activity level.`
      } else if (input.includes("protein") || input.includes("carb") || input.includes("fat")) {
        botResponse = `Your current recommended macro split is ${healthData.macroSplit.protein}% protein, ${healthData.macroSplit.carbs}% carbs, and ${healthData.macroSplit.fat}% fat. This translates to approximately ${Math.round((healthData.dailyCalories * healthData.macroSplit.protein) / 100 / 4)}g protein, ${Math.round((healthData.dailyCalories * healthData.macroSplit.carbs) / 100 / 4)}g carbs, and ${Math.round((healthData.dailyCalories * healthData.macroSplit.fat) / 100 / 9)}g fat daily.`
      } else if (input.includes("weight") || input.includes("bmi")) {
        botResponse = `Your current weight is ${healthData.weight} lbs with a BMI of ${healthData.bmi}, which falls within the normal range. Your estimated body fat percentage is ${healthData.bodyFat}%.`
      } else if (input.includes("meal") || input.includes("food") || input.includes("eat")) {
        botResponse =
          "I can recommend meals based on your nutritional needs and preferences. Would you like me to suggest some options for your next meal?"
      } else if (input.includes("thank")) {
        botResponse = "You're welcome! I'm here to help with any nutrition questions you have."
      } else {
        botResponse =
          "That's an interesting question about nutrition. Would you like me to provide more specific information about meal planning, calorie needs, or nutrient timing?"
      }

      const botMessage = {
        id: messages.length + 2,
        content: botResponse,
        sender: "bot",
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, botMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSendMessage()
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const handleSelectGoal = (goal, option) => {
    setSelectedGoal({
      goal: goal,
      option: option,
    })
  }

  const handleCreatePlan = () => {
    if (!selectedGoal) return

    setIsGeneratingPlan(true)

    // Simulate plan generation
    setTimeout(() => {
      // Generate a plan based on the selected goal
      const newPlan = {
        title: `${selectedGoal.option.name} Nutrition Plan`,
        description: `A personalized nutrition plan to support your ${selectedGoal.option.name.toLowerCase()} goals.`,
        dailyCalories:
          selectedGoal.goal.id === 1 && selectedGoal.option.id === "weight-loss"
            ? healthData.dailyCalories - 300
            : selectedGoal.goal.id === 1 && selectedGoal.option.id === "weight-gain"
              ? healthData.dailyCalories + 300
              : healthData.dailyCalories,
        macroSplit:
          selectedGoal.goal.id === 2 && selectedGoal.option.id === "muscle-gain"
            ? { protein: 35, carbs: 40, fat: 25 }
            : selectedGoal.goal.id === 2 && selectedGoal.option.id === "endurance"
              ? { protein: 25, carbs: 55, fat: 20 }
              : selectedGoal.goal.id === 3 && selectedGoal.option.id === "heart-health"
                ? { protein: 25, carbs: 50, fat: 25 }
                : healthData.macroSplit,
        mealPlan: [
          {
            day: "Monday",
            meals: [
              { type: "Breakfast", name: "Greek Yogurt with Berries and Granola", calories: 350 },
              { type: "Lunch", name: "Grilled Chicken Salad with Avocado", calories: 450 },
              { type: "Dinner", name: "Baked Salmon with Quinoa and Roasted Vegetables", calories: 550 },
              { type: "Snack", name: "Apple with Almond Butter", calories: 200 },
            ],
          },
          {
            day: "Tuesday",
            meals: [
              { type: "Breakfast", name: "Spinach and Feta Omelette with Whole Grain Toast", calories: 380 },
              { type: "Lunch", name: "Turkey and Vegetable Wrap", calories: 420 },
              { type: "Dinner", name: "Lean Beef Stir Fry with Brown Rice", calories: 580 },
              { type: "Snack", name: "Protein Smoothie", calories: 220 },
            ],
          },
          {
            day: "Wednesday",
            meals: [
              { type: "Breakfast", name: "Overnight Oats with Chia Seeds and Fruit", calories: 340 },
              { type: "Lunch", name: "Mediterranean Bowl with Falafel", calories: 460 },
              { type: "Dinner", name: "Grilled Fish Tacos with Slaw", calories: 520 },
              { type: "Snack", name: "Greek Yogurt with Honey", calories: 180 },
            ],
          },
        ],
        recommendations: [
          "Focus on whole, unprocessed foods",
          "Stay hydrated with at least 8 glasses of water daily",
          "Time your protein intake around workouts",
          "Include a variety of colorful vegetables daily",
          "Limit added sugars and processed foods",
        ],
        createdAt: new Date().toISOString(),
      }

      setNutritionPlan(newPlan)
      setIsGeneratingPlan(false)
      setShowGoalDialog(false)

      // Add a message about the new plan
      const botMessage = {
        id: messages.length + 1,
        content: `I've created a personalized nutrition plan for your ${selectedGoal.option.name.toLowerCase()} goal. You can view it in the Goals & Plans tab.`,
        sender: "bot",
        timestamp: new Date().toISOString(),
      }

      setMessages([...messages, botMessage])

      toast({
        title: "Nutrition Plan Created",
        description: `Your personalized ${selectedGoal.option.name} plan is ready to view`,
      })
    }, 3000)
  }

  return (
    <Card className="h-[700px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Nutrition Coach</CardTitle>
              <CardDescription>Your personal AI nutrition assistant</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <Tabs defaultValue="chat" onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="mx-6">
            <TabsTrigger value="chat" className="flex-1">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="health" className="flex-1">
              <Activity className="h-4 w-4 mr-2" />
              Health Data
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex-1">
              <Clipboard className="h-4 w-4 mr-2" />
              Goals & Plans
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col p-0 m-0 data-[state=active]:flex-1">
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="flex gap-2 max-w-[80%]">
                      {message.sender === "bot" && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <div
                          className={`rounded-lg p-3 ${
                            message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{formatTime(message.timestamp)}</p>
                      </div>
                      {message.sender === "user" && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex gap-2 max-w-[80%]">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="rounded-lg p-3 bg-muted">
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"></div>
                            <div
                              className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                            <div
                              className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                              style={{ animationDelay: "0.4s" }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask about nutrition, meal planning, or health goals..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isTyping}
                />
                <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isTyping}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setInputValue("What should my daily calorie intake be?")
                    handleSendMessage()
                  }}
                >
                  Daily calories?
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setInputValue("How much protein should I eat?")
                    handleSendMessage()
                  }}
                >
                  Protein needs?
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setInputValue("Suggest meals for weight loss")
                    handleSendMessage()
                  }}
                >
                  Weight loss meals
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="health" className="flex-1 overflow-auto p-6 m-0 data-[state=active]:flex-1">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Body Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold">{healthData.weight}</div>
                        <p className="text-sm text-muted-foreground">Weight (lbs)</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{healthData.height}</div>
                        <p className="text-sm text-muted-foreground">Height</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{healthData.bmi}</div>
                        <p className="text-sm text-muted-foreground">BMI</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{healthData.bodyFat}%</div>
                        <p className="text-sm text-muted-foreground">Body Fat</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Energy Needs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold">{healthData.basalMetabolicRate}</div>
                        <p className="text-sm text-muted-foreground">BMR (calories)</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{healthData.activityLevel}</div>
                        <p className="text-sm text-muted-foreground">Activity Level</p>
                      </div>
                      <div className="col-span-2">
                        <div className="text-2xl font-bold">{healthData.dailyCalories}</div>
                        <p className="text-sm text-muted-foreground">Daily Calorie Needs</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Macro Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Protein ({healthData.macroSplit.protein}%)</span>
                        <span>{Math.round((healthData.dailyCalories * healthData.macroSplit.protein) / 100 / 4)}g</span>
                      </div>
                      <Progress value={healthData.macroSplit.protein} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Carbs ({healthData.macroSplit.carbs}%)</span>
                        <span>{Math.round((healthData.dailyCalories * healthData.macroSplit.carbs) / 100 / 4)}g</span>
                      </div>
                      <Progress value={healthData.macroSplit.carbs} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Fat ({healthData.macroSplit.fat}%)</span>
                        <span>{Math.round((healthData.dailyCalories * healthData.macroSplit.fat) / 100 / 9)}g</span>
                      </div>
                      <Progress value={healthData.macroSplit.fat} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recent Meals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {healthData.recentMeals.map((meal, index) => (
                      <div key={index} className="flex justify-between items-center pb-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">{meal.name}</p>
                          <p className="text-sm text-muted-foreground">{meal.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{meal.calories} cal</p>
                          <p className="text-xs text-muted-foreground">
                            P: {meal.protein}g • C: {meal.carbs}g • F: {meal.fat}g
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="goals" className="flex-1 overflow-auto p-6 m-0 data-[state=active]:flex-1">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Nutrition Goals</h3>
                <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
                  <DialogTrigger asChild>
                    <Button>Set New Goal</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Set Nutrition Goal</DialogTitle>
                      <DialogDescription>
                        Choose a goal category and specific target to create your personalized nutrition plan
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                      {healthGoals.map((goal) => (
                        <div key={goal.id} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-2 rounded-full">{goal.icon}</div>
                            <div>
                              <h4 className="font-medium">{goal.title}</h4>
                              <p className="text-sm text-muted-foreground">{goal.description}</p>
                            </div>
                          </div>

                          <div className="grid gap-2 pl-10">
                            {goal.options.map((option) => (
                              <div
                                key={option.id}
                                className={`p-3 rounded-md border cursor-pointer transition-colors ${
                                  selectedGoal?.goal.id === goal.id && selectedGoal?.option.id === option.id
                                    ? "border-primary bg-primary/5"
                                    : "hover:bg-muted"
                                }`}
                                onClick={() => handleSelectGoal(goal, option)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h5 className="font-medium">{option.name}</h5>
                                    <p className="text-sm text-muted-foreground">{option.description}</p>
                                  </div>
                                  {selectedGoal?.goal.id === goal.id && selectedGoal?.option.id === option.id && (
                                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowGoalDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreatePlan} disabled={!selectedGoal || isGeneratingPlan}>
                        {isGeneratingPlan ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating Plan...
                          </>
                        ) : (
                          "Create Nutrition Plan"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {nutritionPlan ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{nutritionPlan.title}</CardTitle>
                        <CardDescription>{nutritionPlan.description}</CardDescription>
                      </div>
                      <Badge className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(nutritionPlan.createdAt).toLocaleDateString()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Daily Calories</h4>
                        <div className="text-2xl font-bold">{nutritionPlan.dailyCalories}</div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Protein</h4>
                        <div className="text-2xl font-bold">
                          {Math.round((nutritionPlan.dailyCalories * nutritionPlan.macroSplit.protein) / 100 / 4)}g
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            ({nutritionPlan.macroSplit.protein}%)
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Carbs / Fat</h4>
                        <div className="text-2xl font-bold">
                          {Math.round((nutritionPlan.dailyCalories * nutritionPlan.macroSplit.carbs) / 100 / 4)}g
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            ({nutritionPlan.macroSplit.carbs}%)
                          </span>
                          {" / "}
                          {Math.round((nutritionPlan.dailyCalories * nutritionPlan.macroSplit.fat) / 100 / 9)}g
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            ({nutritionPlan.macroSplit.fat}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Sample Meal Plan</h4>
                      <div className="grid gap-4 md:grid-cols-3">
                        {nutritionPlan.mealPlan.map((day, index) => (
                          <Card key={index}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">{day.day}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {day.meals.map((meal, mealIndex) => (
                                <div key={mealIndex} className="flex justify-between items-center text-sm">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {meal.type}
                                    </Badge>
                                    <span>{meal.name}</span>
                                  </div>
                                  <span>{meal.calories} cal</span>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Recommendations</h4>
                      <ul className="space-y-1">
                        {nutritionPlan.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={() => setActiveTab("chat")}>
                      Discuss with Coach
                    </Button>
                    <Button>Export Plan</Button>
                  </CardFooter>
                </Card>
              ) : (
                <div className="flex items-center justify-center h-40 border rounded-lg">
                  <div className="text-center">
                    <Clipboard className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No active nutrition plan</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Set a nutrition goal to get a personalized plan
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Progress Tracking</h3>
                {nutritionPlan ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Weekly Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Adherence to Plan</span>
                            <span>85%</span>
                          </div>
                          <Progress value={85} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Protein Target</span>
                            <span>92%</span>
                          </div>
                          <Progress value={92} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Calorie Target</span>
                            <span>78%</span>
                          </div>
                          <Progress value={78} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex items-center justify-center h-40 border rounded-lg">
                    <div className="text-center">
                      <BarChart2 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No progress data available</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create a nutrition plan to track your progress
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 mr-2 text-primary" />
            Powered by MealWeek AI Nutrition Coach
          </div>
          <Button variant="outline" size="sm" onClick={() => setActiveTab("chat")}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Ask a Question
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

