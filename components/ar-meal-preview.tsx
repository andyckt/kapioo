"use client"

import { useState, useRef, useEffect } from "react"
import {
  CuboidIcon as Cube,
  Camera,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Share2,
  Download,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

export function ARMealPreview() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [selectedMeal, setSelectedMeal] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const canvasRef = useRef(null)
  const { toast } = useToast()

  const meals = [
    {
      id: 1,
      name: "Grilled Salmon Bowl",
      description: "Wild-caught salmon with quinoa, roasted vegetables, and avocado",
      image: "/placeholder.svg?height=200&width=200",
      modelPath: "/models/salmon-bowl.glb", // This would be a real 3D model path in a real app
      nutrition: {
        calories: 520,
        protein: 32,
        carbs: 45,
        fat: 22,
      },
      portionSize: "Regular (450g)",
    },
    {
      id: 2,
      name: "Chicken Teriyaki Plate",
      description: "Grilled chicken with teriyaki sauce, brown rice, and steamed broccoli",
      image: "/placeholder.svg?height=200&width=200",
      modelPath: "/models/chicken-teriyaki.glb",
      nutrition: {
        calories: 480,
        protein: 35,
        carbs: 50,
        fat: 15,
      },
      portionSize: "Regular (420g)",
    },
    {
      id: 3,
      name: "Mediterranean Veggie Bowl",
      description: "Falafel, hummus, tabbouleh, and roasted vegetables on a bed of quinoa",
      image: "/placeholder.svg?height=200&width=200",
      modelPath: "/models/veggie-bowl.glb",
      nutrition: {
        calories: 450,
        protein: 18,
        carbs: 60,
        fat: 20,
      },
      portionSize: "Regular (400g)",
    },
  ]

  // Simulate loading a 3D model
  useEffect(() => {
    if (selectedMeal) {
      setIsLoading(true)

      // Simulate loading delay
      const timer = setTimeout(() => {
        setIsLoading(false)
        renderMockModel()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [selectedMeal])

  // Mock 3D rendering function
  const renderMockModel = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw a mock 3D representation
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(zoom, zoom)

    // Draw plate
    ctx.beginPath()
    ctx.ellipse(0, 0, 100, 60, 0, 0, 2 * Math.PI)
    ctx.fillStyle = "#f5f5f5"
    ctx.fill()
    ctx.strokeStyle = "#e0e0e0"
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw food items based on selected meal
    if (selectedMeal) {
      if (selectedMeal.id === 1) {
        // Salmon bowl
        // Draw rice/quinoa
        ctx.beginPath()
        ctx.ellipse(0, 0, 80, 50, 0, 0, 2 * Math.PI)
        ctx.fillStyle = "#f0e6d2"
        ctx.fill()

        // Draw salmon
        ctx.beginPath()
        ctx.ellipse(-20, -10, 40, 25, 0.5, 0, 2 * Math.PI)
        ctx.fillStyle = "#ff9e7a"
        ctx.fill()

        // Draw vegetables
        ctx.beginPath()
        ctx.ellipse(30, 10, 30, 20, 0, 0, 2 * Math.PI)
        ctx.fillStyle = "#7ac142"
        ctx.fill()

        // Draw avocado
        ctx.beginPath()
        ctx.ellipse(40, -20, 20, 15, 0.3, 0, 2 * Math.PI)
        ctx.fillStyle = "#a3c442"
        ctx.fill()
      } else if (selectedMeal.id === 2) {
        // Chicken teriyaki
        // Draw rice
        ctx.beginPath()
        ctx.ellipse(0, 10, 70, 40, 0, 0, 2 * Math.PI)
        ctx.fillStyle = "#f5e9c9"
        ctx.fill()

        // Draw chicken
        ctx.beginPath()
        ctx.ellipse(-10, -20, 50, 30, 0.2, 0, 2 * Math.PI)
        ctx.fillStyle = "#d4a76a"
        ctx.fill()

        // Draw sauce
        ctx.beginPath()
        ctx.ellipse(-10, -20, 40, 25, 0.2, 0, 2 * Math.PI)
        ctx.fillStyle = "#8b4513"
        ctx.globalAlpha = 0.3
        ctx.fill()
        ctx.globalAlpha = 1

        // Draw broccoli
        ctx.beginPath()
        ctx.ellipse(50, -10, 25, 20, 0, 0, 2 * Math.PI)
        ctx.fillStyle = "#2e7d32"
        ctx.fill()
      } else if (selectedMeal.id === 3) {
        // Veggie bowl
        // Draw quinoa
        ctx.beginPath()
        ctx.ellipse(0, 0, 80, 50, 0, 0, 2 * Math.PI)
        ctx.fillStyle = "#e8d9b5"
        ctx.fill()

        // Draw falafel
        ctx.beginPath()
        ctx.ellipse(-30, -20, 20, 20, 0, 0, 2 * Math.PI)
        ctx.fillStyle = "#8d6e63"
        ctx.fill()

        // Draw hummus
        ctx.beginPath()
        ctx.ellipse(30, -10, 25, 20, 0.2, 0, 2 * Math.PI)
        ctx.fillStyle = "#f5f5dc"
        ctx.fill()

        // Draw vegetables
        ctx.beginPath()
        ctx.ellipse(0, 20, 40, 20, 0, 0, 2 * Math.PI)
        ctx.fillStyle = "#66bb6a"
        ctx.fill()
      }
    }

    ctx.restore()
  }

  useEffect(() => {
    if (selectedMeal && !isLoading) {
      renderMockModel()
    }
  }, [rotation, zoom, selectedMeal, isLoading])

  const handleRotate = (value) => {
    setRotation(value[0])
  }

  const handleZoom = (value) => {
    setZoom(value[0])
  }

  const resetView = () => {
    setRotation(0)
    setZoom(1)
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleShare = () => {
    toast({
      title: "Share options",
      description: "Sharing options would appear here",
    })
  }

  const handleDownload = () => {
    toast({
      title: "Image saved",
      description: "The current view has been saved to your device",
    })
  }

  const handleSelectMeal = (meal) => {
    setSelectedMeal(meal)
    resetView()
  }

  return (
    <Card className={isFullscreen ? "fixed inset-4 z-50" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cube className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>AR Meal Preview</CardTitle>
              <CardDescription>Visualize your meals in 3D before ordering</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {meals.map((meal) => (
            <Button
              key={meal.id}
              variant={selectedMeal?.id === meal.id ? "default" : "outline"}
              className="h-auto py-2 px-3 flex flex-col items-center gap-2"
              onClick={() => handleSelectMeal(meal)}
            >
              <img
                src={meal.image || "/placeholder.svg"}
                alt={meal.name}
                className="w-full aspect-square object-cover rounded-md"
              />
              <span className="text-xs font-medium text-center">{meal.name}</span>
            </Button>
          ))}
        </div>

        <div className="relative border rounded-md overflow-hidden bg-muted/30 aspect-video">
          {!selectedMeal ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <h3 className="text-sm font-medium">Select a meal to preview</h3>
                <p className="text-xs text-muted-foreground mt-1">View your meal in 3D before ordering</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-2"></div>
                <h3 className="text-sm font-medium">Loading 3D model...</h3>
                <p className="text-xs text-muted-foreground mt-1">Preparing your meal visualization</p>
              </div>
            </div>
          ) : (
            <>
              <canvas ref={canvasRef} width={600} height={400} className="w-full h-full" />

              <div className="absolute bottom-2 right-2 flex gap-1">
                <Button variant="secondary" size="icon" className="h-8 w-8" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon" className="h-8 w-8" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>

        {selectedMeal && !isLoading && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-medium">{selectedMeal.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedMeal.description}</p>
              </div>
              <Badge variant="outline">{selectedMeal.portionSize}</Badge>
            </div>

            <div className="grid grid-cols-4 gap-2 bg-muted/30 rounded-md p-2">
              <div className="text-center">
                <div className="text-sm font-medium">{selectedMeal.nutrition.calories}</div>
                <div className="text-xs text-muted-foreground">kcal</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">{selectedMeal.nutrition.protein}g</div>
                <div className="text-xs text-muted-foreground">Protein</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">{selectedMeal.nutrition.carbs}g</div>
                <div className="text-xs text-muted-foreground">Carbs</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">{selectedMeal.nutrition.fat}g</div>
                <div className="text-xs text-muted-foreground">Fat</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Rotation</span>
                </div>
                <Button variant="ghost" size="sm" onClick={resetView}>
                  Reset
                </Button>
              </div>
              <Slider defaultValue={[0]} min={0} max={360} step={1} value={[rotation]} onValueChange={handleRotate} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ZoomIn className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Zoom</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                    disabled={zoom <= 0.5}
                  >
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <span className="text-xs w-8 text-center">{zoom.toFixed(1)}x</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                    disabled={zoom >= 2}
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Slider defaultValue={[1]} min={0.5} max={2} step={0.1} value={[zoom]} onValueChange={handleZoom} />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">AR preview is a simulation and may differ from actual meals</div>
        <Button variant="outline" disabled={!selectedMeal}>
          Add to Order
        </Button>
      </CardFooter>
    </Card>
  )
}

