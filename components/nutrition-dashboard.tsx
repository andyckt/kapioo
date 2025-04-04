"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Flame, Droplet, Apple, ChevronDown, ChevronUp, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function NutritionDashboard() {
  const [period, setPeriod] = useState("day")
  const [expanded, setExpanded] = useState(false)

  // Daily nutrition data
  const dailyData = {
    calories: {
      consumed: 1450,
      goal: 2000,
      remaining: 550,
    },
    macros: {
      protein: { consumed: 85, goal: 120, unit: "g" },
      carbs: { consumed: 140, goal: 200, unit: "g" },
      fat: { consumed: 45, goal: 65, unit: "g" },
      fiber: { consumed: 18, goal: 25, unit: "g" },
    },
    meals: [
      { name: "Breakfast", calories: 350, protein: 20, carbs: 40, fat: 10 },
      { name: "Lunch", calories: 550, protein: 35, carbs: 60, fat: 20 },
      { name: "Dinner", calories: 550, protein: 30, carbs: 40, fat: 15 },
    ],
    water: { consumed: 1.5, goal: 2.5, unit: "L" },
  }

  // Weekly nutrition data
  const weeklyData = [
    { name: "Mon", calories: 1800, protein: 100, carbs: 180, fat: 60 },
    { name: "Tue", calories: 1650, protein: 90, carbs: 160, fat: 55 },
    { name: "Wed", calories: 1900, protein: 110, carbs: 190, fat: 65 },
    { name: "Thu", calories: 1750, protein: 95, carbs: 170, fat: 60 },
    { name: "Fri", calories: 2100, protein: 120, carbs: 210, fat: 70 },
    { name: "Sat", calories: 2200, protein: 125, carbs: 220, fat: 75 },
    { name: "Sun", calories: 1450, protein: 85, carbs: 140, fat: 45 },
  ]

  // Monthly nutrition data
  const monthlyData = [
    { name: "Week 1", calories: 12500, protein: 700, carbs: 1250, fat: 420 },
    { name: "Week 2", calories: 13200, protein: 740, carbs: 1320, fat: 440 },
    { name: "Week 3", calories: 12800, protein: 720, carbs: 1280, fat: 430 },
    { name: "Week 4", calories: 13500, protein: 760, carbs: 1350, fat: 450 },
  ]

  // Macro distribution for pie chart
  const macroPieData = [
    { name: "Protein", value: dailyData.macros.protein.consumed * 4 }, // 4 calories per gram
    { name: "Carbs", value: dailyData.macros.carbs.consumed * 4 }, // 4 calories per gram
    { name: "Fat", value: dailyData.macros.fat.consumed * 9 }, // 9 calories per gram
  ]

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28"]

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180)
    const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180)

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Nutrition Dashboard</CardTitle>
            <CardDescription>Track your daily nutrition and calorie intake</CardDescription>
          </div>
          <Tabs defaultValue="day" onValueChange={setPeriod} className="w-[200px]">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {period === "day" && (
          <div className="space-y-6">
            {/* Calories and Macros Summary */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="md:col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Flame className="h-4 w-4 text-red-500" />
                    Calories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">
                        {dailyData.calories.consumed} / {dailyData.calories.goal} kcal
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {dailyData.calories.remaining} kcal remaining
                      </span>
                    </div>
                    <Progress value={(dailyData.calories.consumed / dailyData.calories.goal) * 100} className="h-2" />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4">
                    {Object.entries(dailyData.macros).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium capitalize">{key}</span>
                          <span className="text-xs text-muted-foreground">
                            {value.consumed}/{value.goal} {value.unit}
                          </span>
                        </div>
                        <Progress
                          value={(value.consumed / value.goal) * 100}
                          className="h-1.5"
                          // Different colors for different macros
                          style={{
                            backgroundColor: "var(--muted)",
                            "--progress-background":
                              key === "protein"
                                ? "#0088FE"
                                : key === "carbs"
                                  ? "#00C49F"
                                  : key === "fat"
                                    ? "#FFBB28"
                                    : "#FF8042",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Droplet className="h-4 w-4 text-blue-500" />
                    Water Intake
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="relative w-24 h-24">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          className="text-muted stroke-current"
                          strokeWidth="10"
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                        ></circle>
                        <circle
                          className="text-blue-500 stroke-current"
                          strokeWidth="10"
                          strokeLinecap="round"
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 40}
                          strokeDashoffset={2 * Math.PI * 40 * (1 - dailyData.water.consumed / dailyData.water.goal)}
                          transform="rotate(-90 50 50)"
                        ></circle>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-2xl font-bold">{dailyData.water.consumed}</span>
                          <span className="text-sm">/{dailyData.water.goal}L</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="mt-4">
                      Add Water
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Macro Distribution */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Macro Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={macroPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomizedLabel}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {macroPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Meals Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dailyData.meals.map((meal, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{meal.name}</span>
                          <span className="text-sm">{meal.calories} kcal</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-[#0088FE]"></div>
                            P: {meal.protein}g
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-[#00C49F]"></div>
                            C: {meal.carbs}g
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-[#FFBB28]"></div>
                            F: {meal.fat}g
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Expanded Nutrition Details */}
            <div>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Show Less" : "Show More Nutrition Details"}
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>

              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 grid gap-4 md:grid-cols-2"
                >
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Vitamins & Minerals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { name: "Vitamin A", value: 65 },
                          { name: "Vitamin C", value: 80 },
                          { name: "Vitamin D", value: 45 },
                          { name: "Calcium", value: 60 },
                          { name: "Iron", value: 70 },
                          { name: "Potassium", value: 55 },
                        ].map((item) => (
                          <div key={item.name} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium">{item.name}</span>
                                <TooltipProvider>
                                  <UITooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Daily recommended value</p>
                                    </TooltipContent>
                                  </UITooltip>
                                </TooltipProvider>
                              </div>
                              <span className="text-xs text-muted-foreground">{item.value}%</span>
                            </div>
                            <Progress value={item.value} className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Nutrition Goals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { name: "Sugar", consumed: 25, limit: 50, unit: "g" },
                          { name: "Sodium", consumed: 1800, limit: 2300, unit: "mg" },
                          { name: "Cholesterol", consumed: 180, limit: 300, unit: "mg" },
                          { name: "Saturated Fat", consumed: 12, limit: 20, unit: "g" },
                        ].map((item) => (
                          <div key={item.name} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{item.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {item.consumed}/{item.limit} {item.unit}
                              </span>
                            </div>
                            <Progress
                              value={(item.consumed / item.limit) * 100}
                              className="h-1.5"
                              // Red if close to limit
                              style={{
                                backgroundColor: "var(--muted)",
                                "--progress-background":
                                  item.consumed / item.limit > 0.8 ? "#ef4444" : "var(--primary)",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {period === "week" && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Weekly Nutrition Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="calories" fill="#8884d8" name="Calories (kcal)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Weekly Macronutrients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="protein" fill="#0088FE" name="Protein (g)" />
                      <Bar dataKey="carbs" fill="#00C49F" name="Carbs (g)" />
                      <Bar dataKey="fat" fill="#FFBB28" name="Fat (g)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {period === "month" && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Monthly Nutrition Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="calories" fill="#8884d8" name="Calories (kcal)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Monthly Macronutrients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="protein" fill="#0088FE" name="Protein (g)" />
                      <Bar dataKey="carbs" fill="#00C49F" name="Carbs (g)" />
                      <Bar dataKey="fat" fill="#FFBB28" name="Fat (g)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Apple className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Powered by MealWeek Nutrition Tracking</span>
          </div>
          <Button variant="outline" size="sm">
            Connect Fitness App
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

