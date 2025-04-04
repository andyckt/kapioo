"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, Sparkles, ThumbsUp, ThumbsDown, RefreshCw, Filter, Dna, Flame, Heart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
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

export function AIMealRecommendation() {
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState([])
  const [activeTab, setActiveTab] = useState("personalized")
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState({
    calories: [400, 800],
    protein: 25,
    carbs: 50,
    fat: 25,
    spicyLevel: 2,
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    dairyFree: false,
    nutFree: true,
    lowCarb: false,
  })
  const { toast } = useToast()

  // Simulate AI recommendation loading
  const generateRecommendations = () => {
    setLoading(true)

    // Simulate API call delay
    setTimeout(() => {
      const newRecommendations = [
        {
          id: 1,
          name: "Personalized Protein Bowl",
          image: "/placeholder.svg?height=200&width=200",
          description:
            "A custom protein bowl with grilled chicken, quinoa, roasted vegetables, and avocado, tailored to your nutritional preferences.",
          tags: ["High Protein", "Balanced", "Customized"],
          match: 98,
          nutrition: {
            calories: 650,
            protein: 42,
            carbs: 45,
            fat: 28,
          },
          ingredients: [
            "Grilled Chicken",
            "Quinoa",
            "Roasted Vegetables",
            "Avocado",
            "Olive Oil",
            "Lemon Juice",
            "Herbs",
          ],
          aiReasoning:
            "Based on your preference for high protein meals and balanced macros, this bowl provides optimal nutrition while staying within your calorie range. The ingredients were selected to match your dietary restrictions.",
        },
        {
          id: 2,
          name: "Mediterranean Salmon Plate",
          image: "/placeholder.svg?height=200&width=200",
          description:
            "Wild-caught salmon with a Mediterranean herb crust, served with roasted vegetables and a side of hummus.",
          tags: ["Omega-3", "Mediterranean", "Heart Healthy"],
          match: 95,
          nutrition: {
            calories: 720,
            protein: 38,
            carbs: 40,
            fat: 32,
          },
          ingredients: ["Wild Salmon", "Mediterranean Herbs", "Roasted Vegetables", "Hummus", "Olive Oil", "Lemon"],
          aiReasoning:
            "This meal was recommended because your profile indicates a preference for heart-healthy options. The omega-3 fatty acids in salmon complement your nutritional goals, and the Mediterranean flavor profile aligns with your taste preferences.",
        },
        {
          id: 3,
          name: "Seasonal Harvest Bowl",
          image: "/placeholder.svg?height=200&width=200",
          description:
            "A vibrant bowl featuring seasonal vegetables, ancient grains, and plant-based proteins, dressed with a light vinaigrette.",
          tags: ["Seasonal", "Plant-Forward", "Nutrient-Dense"],
          match: 92,
          nutrition: {
            calories: 580,
            protein: 22,
            carbs: 65,
            fat: 24,
          },
          ingredients: ["Seasonal Vegetables", "Farro", "Chickpeas", "Pumpkin Seeds", "Herb Vinaigrette"],
          aiReasoning:
            "Based on your recent meal ratings, you've shown a preference for plant-forward dishes with varied textures. This bowl incorporates seasonal ingredients to provide optimal freshness and nutrient density while maintaining the flavor profiles you enjoy.",
        },
      ]

      setRecommendations(newRecommendations)
      setLoading(false)
    }, 2000)
  }

  useEffect(() => {
    generateRecommendations()
  }, [])

  const handlePreferenceChange = (key, value) => {
    setPreferences({
      ...preferences,
      [key]: value,
    })
  }

  const handleRegenerateRecommendations = () => {
    generateRecommendations()
    toast({
      title: "Recommendations refreshed",
      description: "Your AI meal recommendations have been updated based on your preferences",
    })
  }

  const handleSaveMeal = (meal) => {
    toast({
      title: "Meal saved",
      description: `${meal.name} has been saved to your favorites`,
    })
  }

  const handleLike = (meal) => {
    toast({
      title: "Preference saved",
      description: "Your feedback helps us improve your recommendations",
    })
  }

  const handleDislike = (meal) => {
    toast({
      title: "Preference saved",
      description: "We'll show fewer meals like this in the future",
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>AI Meal Recommendations</CardTitle>
              <CardDescription>Personalized meal suggestions powered by AI</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Preferences
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>AI Recommendation Preferences</DialogTitle>
                  <DialogDescription>Customize your AI-powered meal recommendations</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Calorie Range</Label>
                      <span className="text-sm text-muted-foreground">
                        {preferences.calories[0]} - {preferences.calories[1]} kcal
                      </span>
                    </div>
                    <Slider
                      defaultValue={preferences.calories}
                      min={200}
                      max={1200}
                      step={50}
                      onValueChange={(value) => handlePreferenceChange("calories", value)}
                    />
                  </div>

                  <div className="space-y-4">
                    <Label>Macro Distribution (%)</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Protein</span>
                          <span className="text-sm text-muted-foreground">{preferences.protein}%</span>
                        </div>
                        <Slider
                          defaultValue={[preferences.protein]}
                          min={10}
                          max={60}
                          step={5}
                          onValueChange={(value) => handlePreferenceChange("protein", value[0])}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Carbs</span>
                          <span className="text-sm text-muted-foreground">{preferences.carbs}%</span>
                        </div>
                        <Slider
                          defaultValue={[preferences.carbs]}
                          min={10}
                          max={60}
                          step={5}
                          onValueChange={(value) => handlePreferenceChange("carbs", value[0])}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Fat</span>
                          <span className="text-sm text-muted-foreground">{preferences.fat}%</span>
                        </div>
                        <Slider
                          defaultValue={[preferences.fat]}
                          min={10}
                          max={60}
                          step={5}
                          onValueChange={(value) => handlePreferenceChange("fat", value[0])}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Spicy Level</Label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Mild</span>
                      <Slider
                        defaultValue={[preferences.spicyLevel]}
                        min={1}
                        max={5}
                        step={1}
                        className="w-[60%] mx-4"
                        onValueChange={(value) => handlePreferenceChange("spicyLevel", value[0])}
                      />
                      <span className="text-sm text-muted-foreground">Hot</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Dietary Restrictions</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="vegetarian"
                          checked={preferences.vegetarian}
                          onCheckedChange={(checked) => handlePreferenceChange("vegetarian", checked)}
                        />
                        <Label htmlFor="vegetarian">Vegetarian</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="vegan"
                          checked={preferences.vegan}
                          onCheckedChange={(checked) => handlePreferenceChange("vegan", checked)}
                        />
                        <Label htmlFor="vegan">Vegan</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="gluten-free"
                          checked={preferences.glutenFree}
                          onCheckedChange={(checked) => handlePreferenceChange("glutenFree", checked)}
                        />
                        <Label htmlFor="gluten-free">Gluten-Free</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="dairy-free"
                          checked={preferences.dairyFree}
                          onCheckedChange={(checked) => handlePreferenceChange("dairyFree", checked)}
                        />
                        <Label htmlFor="dairy-free">Dairy-Free</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="nut-free"
                          checked={preferences.nutFree}
                          onCheckedChange={(checked) => handlePreferenceChange("nutFree", checked)}
                        />
                        <Label htmlFor="nut-free">Nut-Free</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="low-carb"
                          checked={preferences.lowCarb}
                          onCheckedChange={(checked) => handlePreferenceChange("lowCarb", checked)}
                        />
                        <Label htmlFor="low-carb">Low-Carb</Label>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowPreferences(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPreferences(false)
                      handleRegenerateRecommendations()
                    }}
                  >
                    Apply & Generate
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" onClick={handleRegenerateRecommendations} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="personalized" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personalized">
              <Sparkles className="h-4 w-4 mr-2" />
              Personalized
            </TabsTrigger>
            <TabsTrigger value="trending">
              <Flame className="h-4 w-4 mr-2" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="health">
              <Dna className="h-4 w-4 mr-2" />
              Health Goals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personalized" className="mt-4">
            {loading ? (
              <div className="grid gap-6 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-0">
                      <Skeleton className="w-full aspect-video rounded-t-lg" />
                      <div className="p-4 space-y-3">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <div className="flex gap-2 pt-2">
                          <Skeleton className="h-6 w-16 rounded-full" />
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {recommendations.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    onLike={() => handleLike(meal)}
                    onDislike={() => handleDislike(meal)}
                    onSave={() => handleSaveMeal(meal)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="trending" className="mt-4">
            <div className="flex items-center justify-center h-40">
              <div className="text-center">
                <Flame className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Trending recommendations coming soon</h3>
                <p className="text-sm text-muted-foreground mt-1">We're analyzing popular meals across our community</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="health" className="mt-4">
            <div className="flex items-center justify-center h-40">
              <div className="text-center">
                <Dna className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Health-focused recommendations coming soon</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your health data to get personalized recommendations
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex items-center text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 mr-2 text-primary" />
          Powered by MealWeek AI
        </div>
        <Button variant="outline" onClick={() => setShowPreferences(true)}>
          Customize Preferences
        </Button>
      </CardFooter>
    </Card>
  )
}

function MealCard({ meal, onLike, onDislike, onSave }) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative">
          <img src={meal.image || "/placeholder.svg"} alt={meal.name} className="w-full aspect-video object-cover" />
          <Badge className="absolute top-2 right-2 bg-primary/90">{meal.match}% Match</Badge>
        </div>

        <div className="p-4 space-y-2">
          <h3 className="font-medium text-lg">{meal.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{meal.description}</p>

          <div className="flex flex-wrap gap-1 pt-1">
            {meal.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex space-x-1">
              <Button variant="ghost" size="sm" onClick={onLike}>
                <ThumbsUp className="h-4 w-4 mr-1" />
                <span className="sr-only">Like</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={onDislike}>
                <ThumbsDown className="h-4 w-4 mr-1" />
                <span className="sr-only">Dislike</span>
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={onSave}>
              <Heart className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>

          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? "Hide Details" : "Show Details"}
          </Button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="pt-2 space-y-3"
              >
                <div>
                  <h4 className="text-sm font-medium">Nutrition</h4>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    <div className="text-center">
                      <div className="text-xs font-medium">{meal.nutrition.calories}</div>
                      <div className="text-xs text-muted-foreground">kcal</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium">{meal.nutrition.protein}g</div>
                      <div className="text-xs text-muted-foreground">Protein</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium">{meal.nutrition.carbs}g</div>
                      <div className="text-xs text-muted-foreground">Carbs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium">{meal.nutrition.fat}g</div>
                      <div className="text-xs text-muted-foreground">Fat</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium">Ingredients</h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {meal.ingredients.map((ingredient) => (
                      <Badge key={ingredient} variant="outline" className="text-xs">
                        {ingredient}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    AI Reasoning
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">{meal.aiReasoning}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  )
}

