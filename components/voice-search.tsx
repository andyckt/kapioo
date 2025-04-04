"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, Search, Loader2, Volume2, X, Check, Clock, History } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

export function VoiceSearch() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchHistory, setSearchHistory] = useState([
    "vegetarian meals under 500 calories",
    "high protein breakfast ideas",
    "quick dinner recipes",
  ])
  const [showHistory, setShowHistory] = useState(false)
  const inputRef = useRef(null)
  const { toast } = useToast()

  // Simulated voice recognition
  useEffect(() => {
    if (isListening) {
      const timer = setTimeout(() => {
        // Simulate voice recognition with predefined phrases
        const phrases = [
          "Show me vegetarian meals",
          "I want high protein dinners",
          "Find meals with chicken and rice",
          "Show me meals under 600 calories",
          "What are some keto friendly options",
        ]
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)]
        setTranscript(randomPhrase)
        setIsListening(false)
        handleSearch(randomPhrase)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [isListening])

  const toggleListening = () => {
    if (!isListening) {
      setTranscript("")
      setIsListening(true)
      toast({
        title: "Listening...",
        description: "Speak your search query clearly",
      })
    } else {
      setIsListening(false)
    }
  }

  const handleSearch = (query) => {
    if (!query) return

    setIsProcessing(true)

    // Add to search history if not already present
    if (!searchHistory.includes(query.toLowerCase())) {
      setSearchHistory([query.toLowerCase(), ...searchHistory].slice(0, 5))
    }

    // Simulate search delay
    setTimeout(() => {
      // Generate mock search results based on query
      let results = []

      if (query.toLowerCase().includes("vegetarian")) {
        results = [
          {
            id: 1,
            name: "Mediterranean Veggie Bowl",
            image: "/placeholder.svg?height=100&width=100",
            calories: 450,
            tags: ["Vegetarian", "Mediterranean", "Lunch"],
          },
          {
            id: 2,
            name: "Spinach and Feta Stuffed Peppers",
            image: "/placeholder.svg?height=100&width=100",
            calories: 380,
            tags: ["Vegetarian", "Greek", "Dinner"],
          },
          {
            id: 3,
            name: "Vegetable Curry with Rice",
            image: "/placeholder.svg?height=100&width=100",
            calories: 520,
            tags: ["Vegetarian", "Indian", "Spicy"],
          },
        ]
      } else if (query.toLowerCase().includes("protein")) {
        results = [
          {
            id: 4,
            name: "Grilled Chicken Power Bowl",
            image: "/placeholder.svg?height=100&width=100",
            calories: 580,
            tags: ["High Protein", "Lunch", "Meal Prep"],
          },
          {
            id: 5,
            name: "Salmon with Quinoa",
            image: "/placeholder.svg?height=100&width=100",
            calories: 620,
            tags: ["High Protein", "Omega-3", "Dinner"],
          },
          {
            id: 6,
            name: "Greek Yogurt Parfait",
            image: "/placeholder.svg?height=100&width=100",
            calories: 320,
            tags: ["High Protein", "Breakfast", "Quick"],
          },
        ]
      } else if (query.toLowerCase().includes("chicken")) {
        results = [
          {
            id: 7,
            name: "Lemon Herb Roasted Chicken",
            image: "/placeholder.svg?height=100&width=100",
            calories: 450,
            tags: ["Chicken", "Dinner", "Classic"],
          },
          {
            id: 8,
            name: "Chicken Fajita Bowl",
            image: "/placeholder.svg?height=100&width=100",
            calories: 520,
            tags: ["Chicken", "Mexican", "Lunch"],
          },
          {
            id: 9,
            name: "Thai Chicken Curry",
            image: "/placeholder.svg?height=100&width=100",
            calories: 580,
            tags: ["Chicken", "Thai", "Spicy"],
          },
        ]
      } else if (query.toLowerCase().includes("calories") || query.toLowerCase().includes("under")) {
        results = [
          {
            id: 10,
            name: "Zucchini Noodle Stir Fry",
            image: "/placeholder.svg?height=100&width=100",
            calories: 320,
            tags: ["Low Calorie", "Vegetarian", "Quick"],
          },
          {
            id: 11,
            name: "Cauliflower Rice Bowl",
            image: "/placeholder.svg?height=100&width=100",
            calories: 380,
            tags: ["Low Calorie", "Keto", "Dinner"],
          },
          {
            id: 12,
            name: "Shrimp and Vegetable Skewers",
            image: "/placeholder.svg?height=100&width=100",
            calories: 290,
            tags: ["Low Calorie", "Seafood", "Grill"],
          },
        ]
      } else if (query.toLowerCase().includes("keto")) {
        results = [
          {
            id: 13,
            name: "Avocado and Bacon Salad",
            image: "/placeholder.svg?height=100&width=100",
            calories: 450,
            tags: ["Keto", "Lunch", "High Fat"],
          },
          {
            id: 14,
            name: "Cheesy Cauliflower Bake",
            image: "/placeholder.svg?height=100&width=100",
            calories: 380,
            tags: ["Keto", "Vegetarian", "Comfort"],
          },
          {
            id: 15,
            name: "Steak with Garlic Butter",
            image: "/placeholder.svg?height=100&width=100",
            calories: 620,
            tags: ["Keto", "Dinner", "High Protein"],
          },
        ]
      } else {
        // Default results
        results = [
          {
            id: 16,
            name: "Classic Caesar Salad",
            image: "/placeholder.svg?height=100&width=100",
            calories: 380,
            tags: ["Salad", "Lunch", "Classic"],
          },
          {
            id: 17,
            name: "Beef and Broccoli Stir Fry",
            image: "/placeholder.svg?height=100&width=100",
            calories: 520,
            tags: ["Beef", "Asian", "Quick"],
          },
          {
            id: 18,
            name: "Mushroom Risotto",
            image: "/placeholder.svg?height=100&width=100",
            calories: 580,
            tags: ["Vegetarian", "Italian", "Dinner"],
          },
        ]
      }

      setSearchResults(results)
      setIsProcessing(false)
    }, 1500)
  }

  const handleInputChange = (e) => {
    setTranscript(e.target.value)
  }

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch(transcript)
    }
  }

  const handleHistoryItemClick = (query) => {
    setTranscript(query)
    handleSearch(query)
    setShowHistory(false)
  }

  const clearTranscript = () => {
    setTranscript("")
    setSearchResults([])
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleAddToMealPlan = (meal) => {
    toast({
      title: "Added to meal plan",
      description: `${meal.name} has been added to your meal plan`,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          Voice Search
        </CardTitle>
        <CardDescription>Search for meals using your voice or text</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                placeholder="Search for meals or say 'Show me vegetarian meals'..."
                value={transcript}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                className="pr-10"
                onFocus={() => setShowHistory(true)}
                onBlur={() => setTimeout(() => setShowHistory(false), 200)}
              />
              {transcript && (
                <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={clearTranscript}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button
              variant={isListening ? "destructive" : "default"}
              size="icon"
              onClick={toggleListening}
              disabled={isProcessing}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button onClick={() => handleSearch(transcript)} disabled={!transcript || isProcessing}>
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
          </div>

          <AnimatePresence>
            {showHistory && searchHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-md"
              >
                <div className="p-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <Clock className="h-3 w-3" />
                    <span>Recent searches</span>
                  </div>
                  <ul className="space-y-1">
                    {searchHistory.map((query, index) => (
                      <li key={index}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-sm"
                          onClick={() => handleHistoryItemClick(query)}
                        >
                          <History className="h-3 w-3 mr-2 text-muted-foreground" />
                          {query}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isListening && (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="relative inline-flex">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20"></div>
                <div className="relative rounded-full bg-primary p-4">
                  <Mic className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
              <p className="mt-4 text-sm font-medium">Listening...</p>
              <p className="text-xs text-muted-foreground">Speak clearly into your microphone</p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-4 text-sm font-medium">Processing your request...</p>
              <p className="text-xs text-muted-foreground">Finding the best matches</p>
            </div>
          </div>
        )}

        {!isListening && !isProcessing && searchResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Search Results</h3>
              <Badge variant="outline">{searchResults.length} meals found</Badge>
            </div>

            <div className="space-y-3">
              {searchResults.map((meal) => (
                <div
                  key={meal.id}
                  className="flex items-center gap-3 p-2 border rounded-md hover:bg-muted/50 transition-colors"
                >
                  <img
                    src={meal.image || "/placeholder.svg"}
                    alt={meal.name}
                    className="h-16 w-16 rounded-md object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{meal.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {meal.calories} kcal
                      </Badge>
                      <div className="flex gap-1">
                        {meal.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleAddToMealPlan(meal)}>
                    <Check className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isListening && !isProcessing && searchResults.length === 0 && transcript && (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <Search className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="mt-4 text-sm font-medium">No results found</p>
              <p className="text-xs text-muted-foreground">Try a different search term</p>
            </div>
          </div>
        )}

        {!isListening && !isProcessing && !transcript && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Try saying or typing:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                "Show me vegetarian meals",
                "I want high protein dinners",
                "Find meals with chicken",
                "Show me meals under 600 calories",
                "What are some keto friendly options",
                "Quick lunch ideas",
              ].map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start h-auto py-2 px-3"
                  onClick={() => {
                    setTranscript(suggestion)
                    handleSearch(suggestion)
                  }}
                >
                  <Mic className="h-3 w-3 mr-2 text-muted-foreground" />
                  <span className="text-sm">{suggestion}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">Voice search works best in a quiet environment</div>
        <Button variant="link" size="sm" className="text-xs">
          Voice Search Help
        </Button>
      </CardFooter>
    </Card>
  )
}

