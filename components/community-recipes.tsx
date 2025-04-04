"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Heart, MessageSquare, Share2, Star, Clock, Users, Bookmark, BookmarkCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"

export function CommunityRecipes() {
  const [activeTab, setActiveTab] = useState("trending")
  const [searchQuery, setSearchQuery] = useState("")
  const [savedRecipes, setSavedRecipes] = useState([])
  const { toast } = useToast()

  // Sample community recipes
  const recipes = [
    {
      id: 1,
      title: "Homemade Chicken Alfredo",
      description: "A creamy and delicious pasta dish that's perfect for weeknight dinners.",
      image: "/placeholder.svg?height=200&width=300",
      author: {
        name: "Sarah Johnson",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      stats: {
        likes: 245,
        comments: 32,
        rating: 4.8,
      },
      tags: ["Italian", "Pasta", "Dinner"],
      time: "30 min",
      servings: 4,
      difficulty: "Medium",
    },
    {
      id: 2,
      title: "Vegan Buddha Bowl",
      description: "A nutritious and colorful bowl packed with plant-based goodness.",
      image: "/placeholder.svg?height=200&width=300",
      author: {
        name: "Michael Chen",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      stats: {
        likes: 189,
        comments: 24,
        rating: 4.6,
      },
      tags: ["Vegan", "Healthy", "Lunch"],
      time: "20 min",
      servings: 2,
      difficulty: "Easy",
    },
    {
      id: 3,
      title: "Spicy Shrimp Tacos",
      description: "Flavorful shrimp tacos with a kick of heat and fresh toppings.",
      image: "/placeholder.svg?height=200&width=300",
      author: {
        name: "Elena Rodriguez",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      stats: {
        likes: 312,
        comments: 45,
        rating: 4.9,
      },
      tags: ["Mexican", "Seafood", "Spicy"],
      time: "25 min",
      servings: 3,
      difficulty: "Medium",
    },
    {
      id: 4,
      title: "Classic Beef Burger",
      description: "The ultimate homemade burger with all the fixings.",
      image: "/placeholder.svg?height=200&width=300",
      author: {
        name: "James Wilson",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      stats: {
        likes: 278,
        comments: 38,
        rating: 4.7,
      },
      tags: ["American", "Beef", "Dinner"],
      time: "35 min",
      servings: 4,
      difficulty: "Medium",
    },
    {
      id: 5,
      title: "Overnight Oats with Berries",
      description: "A simple and nutritious breakfast that you can prepare the night before.",
      image: "/placeholder.svg?height=200&width=300",
      author: {
        name: "Emma Thompson",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      stats: {
        likes: 156,
        comments: 19,
        rating: 4.5,
      },
      tags: ["Breakfast", "Healthy", "Vegetarian"],
      time: "5 min + overnight",
      servings: 1,
      difficulty: "Easy",
    },
    {
      id: 6,
      title: "Homemade Margherita Pizza",
      description: "A classic Italian pizza with fresh mozzarella, tomatoes, and basil.",
      image: "/placeholder.svg?height=200&width=300",
      author: {
        name: "Marco Rossi",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      stats: {
        likes: 289,
        comments: 41,
        rating: 4.8,
      },
      tags: ["Italian", "Pizza", "Dinner"],
      time: "45 min",
      servings: 2,
      difficulty: "Medium",
    },
  ]

  const filteredRecipes = recipes.filter(
    (recipe) =>
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleSaveRecipe = (recipeId) => {
    if (savedRecipes.includes(recipeId)) {
      setSavedRecipes(savedRecipes.filter((id) => id !== recipeId))
      toast({
        title: "Recipe unsaved",
        description: "Recipe removed from your saved collection",
      })
    } else {
      setSavedRecipes([...savedRecipes, recipeId])
      toast({
        title: "Recipe saved",
        description: "Recipe added to your saved collection",
      })
    }
  }

  const handleLikeRecipe = (recipeId) => {
    toast({
      title: "Recipe liked",
      description: "You liked this recipe",
    })
  }

  const handleShareRecipe = (recipeId) => {
    toast({
      title: "Share options",
      description: "Sharing options would appear here",
    })
  }

  const renderRecipeCard = (recipe) => (
    <motion.div key={recipe.id} whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
      <Card className="h-full flex flex-col overflow-hidden">
        <div className="relative">
          <img
            src={recipe.image || "/placeholder.svg"}
            alt={recipe.title}
            className="w-full aspect-video object-cover"
          />
          <div className="absolute top-2 right-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
              onClick={() => handleSaveRecipe(recipe.id)}
            >
              {savedRecipes.includes(recipe.id) ? (
                <BookmarkCheck className="h-4 w-4 text-primary" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <CardHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={recipe.author.avatar} alt={recipe.author.name} />
                <AvatarFallback>{recipe.author.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{recipe.author.name}</span>
            </div>
            <div className="flex items-center">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              <span className="text-xs ml-1">{recipe.stats.rating}</span>
            </div>
          </div>
          <CardTitle className="text-lg mt-2">{recipe.title}</CardTitle>
          <CardDescription className="line-clamp-2 h-10">{recipe.description}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2 flex-grow">
          <div className="flex flex-wrap gap-1 mb-3">
            {recipe.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{recipe.time}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{recipe.servings} servings</span>
            </div>
            <div>
              <span>{recipe.difficulty}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 border-t">
          <div className="flex justify-between w-full">
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleLikeRecipe(recipe.id)}>
              <Heart className="h-4 w-4 mr-1" />
              <span className="text-xs">{recipe.stats.likes}</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <MessageSquare className="h-4 w-4 mr-1" />
              <span className="text-xs">{recipe.stats.comments}</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleShareRecipe(recipe.id)}>
              <Share2 className="h-4 w-4 mr-1" />
              <span className="text-xs">Share</span>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Community Recipes</CardTitle>
            <CardDescription>Discover and share recipes with the MealWeek community</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Tabs defaultValue="trending" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecipes
                .sort((a, b) => b.stats.likes - a.stats.likes)
                .slice(0, 6)
                .map((recipe) => renderRecipeCard(recipe))}
            </div>
          </TabsContent>

          <TabsContent value="recent" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecipes
                .sort((a, b) => b.id - a.id)
                .slice(0, 6)
                .map((recipe) => renderRecipeCard(recipe))}
            </div>
          </TabsContent>

          <TabsContent value="popular" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecipes
                .sort((a, b) => b.stats.rating - a.stats.rating)
                .slice(0, 6)
                .map((recipe) => renderRecipeCard(recipe))}
            </div>
          </TabsContent>

          <TabsContent value="saved" className="mt-4">
            {savedRecipes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRecipes
                  .filter((recipe) => savedRecipes.includes(recipe.id))
                  .map((recipe) => renderRecipeCard(recipe))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No saved recipes yet</h3>
                <p className="text-muted-foreground mb-4">Save recipes you like by clicking the bookmark icon</p>
                <Button variant="outline" onClick={() => setActiveTab("trending")}>
                  Browse Trending Recipes
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Submit Your Recipe</Button>
        <Button>View All Recipes</Button>
      </CardFooter>
    </Card>
  )
}

