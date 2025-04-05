"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Check, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { type Meal } from "@/lib/utils"

interface MealCustomizationProps {
  meal: Meal;
  onClose: () => void;
}

export function MealCustomization({ meal, onClose }: MealCustomizationProps) {
  const [baseOption, setBaseOption] = useState("default")
  const [protein, setProtein] = useState("default")
  const [extras, setExtras] = useState<string[]>([])
  const [allergies, setAllergies] = useState<string[]>([])
  const [specialInstructions, setSpecialInstructions] = useState("")
  const [expanded, setExpanded] = useState("base")
  const { toast } = useToast()

  const toggleSection = (section: string) => {
    if (expanded === section) {
      setExpanded("")
    } else {
      setExpanded(section)
    }
  }

  const handleExtraToggle = (extra: string) => {
    if (extras.includes(extra)) {
      setExtras(extras.filter(e => e !== extra))
    } else {
      setExtras([...extras, extra])
    }
  }

  const handleAllergyToggle = (allergy: string) => {
    if (allergies.includes(allergy)) {
      setAllergies(allergies.filter(a => a !== allergy))
    } else {
      setAllergies([...allergies, allergy])
    }
  }

  const handleSave = () => {
    toast({
      title: "Customization saved",
      description: "Your meal preferences have been saved",
    })
    onClose && onClose()
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Customize Your Meal</CardTitle>
        <CardDescription>Personalize {meal?.name || "your meal"} to your preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Base Options */}
        <div className="space-y-2">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection("base")}>
            <h3 className="font-medium">Base Options</h3>
            {expanded === "base" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>

          {expanded === "base" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-2"
            >
              <RadioGroup value={baseOption} onValueChange={setBaseOption}>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="default" id="base-default" />
                  <Label htmlFor="base-default">Regular (Brown Rice)</Label>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="quinoa" id="base-quinoa" />
                  <Label htmlFor="base-quinoa">Quinoa (+0.2 credits)</Label>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="cauliflower" id="base-cauliflower" />
                  <Label htmlFor="base-cauliflower">Cauliflower Rice (Low-Carb)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="salad" id="base-salad" />
                  <Label htmlFor="base-salad">Mixed Greens</Label>
                </div>
              </RadioGroup>
            </motion.div>
          )}
        </div>

        <Separator />

        {/* Protein Options */}
        <div className="space-y-2">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection("protein")}>
            <h3 className="font-medium">Protein Options</h3>
            {expanded === "protein" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>

          {expanded === "protein" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-2"
            >
              <RadioGroup value={protein} onValueChange={setProtein}>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="default" id="protein-default" />
                  <Label htmlFor="protein-default">Regular (Chicken)</Label>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="double" id="protein-double" />
                  <Label htmlFor="protein-double">Double Protein (+0.5 credits)</Label>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="tofu" id="protein-tofu" />
                  <Label htmlFor="protein-tofu">Tofu (Vegetarian)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="beef" id="protein-beef" />
                  <Label htmlFor="protein-beef">Beef (+0.3 credits)</Label>
                </div>
              </RadioGroup>
            </motion.div>
          )}
        </div>

        <Separator />

        {/* Extra Add-ons */}
        <div className="space-y-2">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection("extras")}>
            <h3 className="font-medium">Extra Add-ons</h3>
            {expanded === "extras" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>

          {expanded === "extras" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-2"
            >
              <div className="grid grid-cols-2 gap-2">
                {["Avocado (+0.2 credits)", "Extra Sauce", "Roasted Vegetables", "Cheese"].map((extra) => (
                  <div key={extra} className="flex items-center space-x-2">
                    <Checkbox
                      id={`extra-${extra}`}
                      checked={extras.includes(extra)}
                      onCheckedChange={() => handleExtraToggle(extra)}
                    />
                    <Label htmlFor={`extra-${extra}`}>{extra}</Label>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <Separator />

        {/* Allergies & Restrictions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection("allergies")}>
            <h3 className="font-medium">Allergies & Restrictions</h3>
            {expanded === "allergies" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>

          {expanded === "allergies" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-2"
            >
              <div className="grid grid-cols-2 gap-2">
                {["Gluten", "Dairy", "Nuts", "Soy", "Shellfish", "Eggs"].map((allergy) => (
                  <div key={allergy} className="flex items-center space-x-2">
                    <Checkbox
                      id={`allergy-${allergy}`}
                      checked={allergies.includes(allergy)}
                      onCheckedChange={() => handleAllergyToggle(allergy)}
                    />
                    <Label htmlFor={`allergy-${allergy}`}>No {allergy}</Label>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-amber-600 text-sm mt-4">
                <AlertCircle className="h-4 w-4" />
                <span>Our kitchen handles all allergens. We cannot guarantee against cross-contamination.</span>
              </div>
            </motion.div>
          )}
        </div>

        <Separator />

        {/* Special Instructions */}
        <div className="space-y-2">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection("instructions")}
          >
            <h3 className="font-medium">Special Instructions</h3>
            {expanded === "instructions" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>

          {expanded === "instructions" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-2"
            >
              <textarea
                className="w-full min-h-[100px] p-2 border rounded-md"
                placeholder="Add any special instructions or requests here..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
              />
            </motion.div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Customization</Button>
      </CardFooter>
    </Card>
  )
}

