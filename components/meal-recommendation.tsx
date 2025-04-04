"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ThumbsUp, ThumbsDown, Star, Heart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

export function MealRecommendation({ userPreferences = {} }) {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Simulate fetching recommendations based on user preferences
  useEffect(() => {
    const fetchRecommendations = async () => {
      // In a real app, this would be an API call
      setTimeout(() => {
        setRecommendations([
          {
            id: 1,
            name: "Mediterranean Bowl",
            image: "/placeholder.svg?height=200&width=200",
            description: "Fresh falafel, hummus, tabbouleh, and roasted vegetables on a bed of quinoa.",
            tags: ["Vegetarian", "High Protein", "Mediterranean"],
            rating: 4.8,
            match: 98,
          },
          {
            id: 2,
            name: "Teriyaki Salmon",
            image: "/placeholder.svg?height=200&width=200",
            description:
              "Wild-caught salmon glazed with homemade teriyaki sauce, served with brown rice and steamed broccoli.",
            tags: ["Pescatarian", "High Protein", "Gluten-Free"],
            rating: 4.7,
            match: 95,
          },
          {
            id: 3,
            name: "Protein Power Bowl",
            image: "/placeholder.svg?height=200&width=200",
            description: "Grilled chicken, black beans, avocado, and roasted sweet potatoes on a bed of mixed greens.",
            tags: ["High Protein", "Low Carb", "Paleo"],
            rating: 4.6,
            match: 92,
          },
        ])
        setLoading(false)
      }, 1000)
    }

    fetchRecommendations()
  }, [userPreferences])

  const handleLike = (id) => {
    toast({
      title: "Preference saved",
      description: "We'll recommend more meals like this",
    })
  }

  const handleDislike = (id) => {
    toast({
      title: "Preference saved",
      description: "We'll show fewer meals like this",
    })
  }

  const handleSave = (id) => {
    toast({
      title: "Meal saved",
      description: "Added to your favorites",
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommended for You</CardTitle>
          <CardDescription>Personalized meal recommendations based on your preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommended for You</CardTitle>
        <CardDescription>Personalized meal recommendations based on your preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {recommendations.map((meal) => (
            <motion.div
              key={meal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-lg border overflow-hidden"
            >
              <div className="relative">
                <img
                  src={meal.image || "/placeholder.svg"}
                  alt={meal.name}
                  className="w-full aspect-video object-cover"
                />
                <Badge className="absolute top-2 right-2 bg-primary/90">{meal.match}% Match</Badge>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{meal.name}</h3>
                  <div className="flex items-center">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs ml-1">{meal.rating}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{meal.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {meal.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex justify-between mt-4">
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleLike(meal.id)}>
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDislike(meal.id)}>
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSave(meal.id)}>
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          View All Recommendations
        </Button>
      </CardFooter>
    </Card>
  )
}

