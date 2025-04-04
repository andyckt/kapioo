"use client"

import { useState } from "react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export function DietaryPreferences() {
  const [preferences, setPreferences] = useState({
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    dairyFree: false,
    nutFree: false,
    lowCarb: false,
    keto: false,
    pescatarian: false,
  })

  const [allergies, setAllergies] = useState({
    nuts: false,
    dairy: false,
    eggs: false,
    soy: false,
    wheat: false,
    fish: false,
    shellfish: false,
  })

  const { toast } = useToast()

  const handlePreferenceChange = (id) => {
    setPreferences({
      ...preferences,
      [id]: !preferences[id],
    })
  }

  const handleAllergyChange = (id) => {
    setAllergies({
      ...allergies,
      [id]: !allergies[id],
    })
  }

  const savePreferences = () => {
    toast({
      title: "Preferences saved",
      description: "Your dietary preferences have been updated",
    })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card>
        <CardHeader>
          <CardTitle>Dietary Preferences</CardTitle>
          <CardDescription>Let us know about your dietary preferences and allergies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-medium">Diet Preferences</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(preferences).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox id={key} checked={value} onCheckedChange={() => handlePreferenceChange(key)} />
                  <Label htmlFor={key} className="capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Allergies</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(allergies).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox id={`allergy-${key}`} checked={value} onCheckedChange={() => handleAllergyChange(key)} />
                  <Label htmlFor={`allergy-${key}`} className="capitalize">
                    {key}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={savePreferences}>Save Preferences</Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

