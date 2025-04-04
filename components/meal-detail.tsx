"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Clock, Heart, Star, Utensils, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function MealDetail({ meal, day, onSelect, isSelected }) {
  const [isFavorite, setIsFavorite] = useState(false)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.03 }}
          className={`rounded-lg border p-4 cursor-pointer ${isSelected ? "border-primary bg-primary/5" : ""}`}
          onClick={() => onSelect(day)}
        >
          <div className="aspect-square relative mb-2 overflow-hidden rounded-md">
            <img
              src={meal.image || "/placeholder.svg"}
              alt={meal.name}
              className="object-cover w-full h-full transition-transform hover:scale-105"
            />
            <div className="absolute top-2 right-2 bg-background rounded-full p-1 shadow">
              <div className={`h-4 w-4 rounded-full ${isSelected ? "bg-primary" : "bg-muted"}`} />
            </div>
          </div>
          <div className="space-y-1 text-center">
            <h3 className="font-medium capitalize">{day}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{meal.name}</p>
          </div>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{meal.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className={isFavorite ? "text-red-500" : ""}
              onClick={() => setIsFavorite(!isFavorite)}
            >
              <Heart className="h-5 w-5" />
            </Button>
          </DialogTitle>
          <DialogDescription className="capitalize">{day}'s Meal</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="aspect-video overflow-hidden rounded-md">
            <img
              src={meal.image || "/placeholder.svg?height=300&width=500"}
              alt={meal.name}
              className="object-cover w-full h-full"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Star className="h-3 w-3" /> 4.8 (124 reviews)
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> 30 min prep
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Utensils className="h-3 w-3" /> 450 cal
            </Badge>
          </div>

          <Tabs defaultValue="description">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
              <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="space-y-2">
              <p className="text-sm">
                {meal.description ||
                  `Our delicious ${meal.name} is prepared with fresh ingredients and delivered to your door. Perfect for a healthy and satisfying meal without the hassle of cooking.`}
              </p>
            </TabsContent>
            <TabsContent value="ingredients" className="space-y-2">
              <ul className="text-sm list-disc pl-5 space-y-1">
                <li>Fresh vegetables</li>
                <li>Premium protein</li>
                <li>Whole grains</li>
                <li>Herbs and spices</li>
                <li>Healthy oils</li>
              </ul>
              <div className="flex items-center gap-2 text-amber-600 text-sm mt-2">
                <AlertCircle className="h-4 w-4" />
                <span>Contains: Gluten, Dairy</span>
              </div>
            </TabsContent>
            <TabsContent value="nutrition" className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Calories:</span>
                  <span className="font-medium">450 kcal</span>
                </div>
                <div className="flex justify-between">
                  <span>Protein:</span>
                  <span className="font-medium">25g</span>
                </div>
                <div className="flex justify-between">
                  <span>Carbs:</span>
                  <span className="font-medium">45g</span>
                </div>
                <div className="flex justify-between">
                  <span>Fat:</span>
                  <span className="font-medium">15g</span>
                </div>
                <div className="flex justify-between">
                  <span>Fiber:</span>
                  <span className="font-medium">8g</span>
                </div>
                <div className="flex justify-between">
                  <span>Sodium:</span>
                  <span className="font-medium">600mg</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => onSelect(day)}>
              {isSelected ? "Remove from Order" : "Add to Order"}
            </Button>
            <Button>View Similar Meals</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

