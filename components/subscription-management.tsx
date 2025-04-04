"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Check, CreditCard, Calendar, AlertCircle, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function SubscriptionManagement() {
  const [currentPlan, setCurrentPlan] = useState("standard")
  const [billingCycle, setBillingCycle] = useState("monthly")
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [selectedUpgrade, setSelectedUpgrade] = useState(null)
  const { toast } = useToast()

  const plans = {
    basic: {
      name: "Basic",
      price: { monthly: 49, annual: 490 },
      credits: 10,
      features: ["10 meal credits per month", "Basic meal selection", "Email support", "Weekly delivery"],
      color: "bg-muted",
    },
    standard: {
      name: "Standard",
      price: { monthly: 99, annual: 990 },
      credits: 25,
      features: [
        "25 meal credits per month",
        "Full meal selection",
        "Priority delivery",
        "Email and chat support",
        "Meal customization",
      ],
      color: "bg-primary",
      popular: true,
    },
    premium: {
      name: "Premium",
      price: { monthly: 149, annual: 1490 },
      credits: 40,
      features: [
        "40 meal credits per month",
        "Premium meal selection",
        "Priority delivery with time selection",
        "24/7 priority support",
        "Advanced meal customization",
        "Exclusive recipes",
        "Nutritionist consultation",
      ],
      color: "bg-zinc-900 dark:bg-zinc-800",
    },
  }

  const handleUpgrade = (plan) => {
    setSelectedUpgrade(plan)
    setShowUpgradeDialog(true)
  }

  const confirmUpgrade = () => {
    setCurrentPlan(selectedUpgrade)
    setShowUpgradeDialog(false)
    toast({
      title: "Subscription updated",
      description: `You have successfully upgraded to the ${plans[selectedUpgrade].name} plan`,
    })
  }

  const handleBillingCycleChange = (cycle) => {
    setBillingCycle(cycle)
    toast({
      title: "Billing cycle updated",
      description: `Your billing cycle has been updated to ${cycle}`,
    })
  }

  const getAnnualSavings = (plan) => {
    const monthlyTotal = plans[plan].price.monthly * 12
    const annualTotal = plans[plan].price.annual
    return Math.round(((monthlyTotal - annualTotal) / monthlyTotal) * 100)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Management</CardTitle>
        <CardDescription>Manage your MealWeek subscription plan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border p-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <h3 className="font-medium text-lg">Current Plan</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${plans[currentPlan].color} text-primary-foreground`}>
                  {plans[currentPlan].name}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {billingCycle === "monthly" ? "Monthly" : "Annual"} billing
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Your next billing date is April 15, 2025</p>
            </div>
            <div className="flex flex-col items-end justify-center">
              <div className="text-2xl font-bold">
                ${plans[currentPlan].price[billingCycle]}
                <span className="text-sm font-normal text-muted-foreground">
                  /{billingCycle === "monthly" ? "mo" : "yr"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {plans[currentPlan].credits} credits per {billingCycle === "monthly" ? "month" : "year"}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium mb-2">Billing Cycle</h4>
            <RadioGroup
              defaultValue={billingCycle}
              onValueChange={handleBillingCycleChange}
              className="flex flex-col sm:flex-row gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="flex items-center gap-2">
                  Monthly
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="annual" id="annual" />
                <Label htmlFor="annual" className="flex items-center gap-2">
                  Annual
                  <Badge
                    variant="outline"
                    className="text-xs bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                  >
                    Save {getAnnualSavings(currentPlan)}%
                  </Badge>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium mb-2">Payment Method</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <span>•••• •••• •••• 4242</span>
                <Badge variant="outline" className="ml-2">
                  Default
                </Badge>
              </div>
              <Button variant="outline" size="sm">
                Update
              </Button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium text-lg mb-4">Available Plans</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(plans).map(([key, plan]) => (
              <motion.div
                key={key}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
                className={`relative rounded-lg border ${
                  currentPlan === key ? "border-primary ring-1 ring-primary" : ""
                } overflow-hidden`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-2 py-1 text-xs rounded-bl-lg">
                    Popular
                  </div>
                )}
                <div className={`${plan.color} text-primary-foreground p-4`}>
                  <h3 className="font-bold text-xl">{plan.name}</h3>
                  <div className="mt-1">
                    <span className="text-2xl font-bold">${plan.price[billingCycle]}</span>
                    <span className="text-sm">/{billingCycle === "monthly" ? "mo" : "yr"}</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-sm font-medium mb-2">
                    {plan.credits} credits per {billingCycle === "monthly" ? "month" : "year"}
                  </div>
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {currentPlan === key ? (
                    <Button className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={key === "premium" ? "default" : "outline"}
                      onClick={() => handleUpgrade(key)}
                    >
                      {key === "basic" ? "Downgrade" : "Upgrade"}
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-4 border-t pt-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>You can change or cancel your plan at any time</span>
        </div>
        <Button variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50">
          Cancel Subscription
        </Button>
      </CardFooter>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUpgrade === "basic" ? "Downgrade" : "Upgrade"} to{" "}
              {selectedUpgrade && plans[selectedUpgrade].name} Plan
            </DialogTitle>
            <DialogDescription>
              {selectedUpgrade === "basic"
                ? "Are you sure you want to downgrade your plan? You'll have fewer credits and features."
                : "Upgrade your plan to get more credits and premium features."}
            </DialogDescription>
          </DialogHeader>

          {selectedUpgrade && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <Badge className={`${plans[currentPlan].color} text-primary-foreground`}>
                      {plans[currentPlan].name}
                    </Badge>
                    <span className="text-sm ml-2">Current</span>
                  </div>
                  <div className="text-lg font-bold">
                    ${plans[currentPlan].price[billingCycle]}/{billingCycle === "monthly" ? "mo" : "yr"}
                  </div>
                </div>

                <div className="flex items-center justify-center my-2">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <Badge className={`${plans[selectedUpgrade].color} text-primary-foreground`}>
                      {plans[selectedUpgrade].name}
                    </Badge>
                    <span className="text-sm ml-2">New</span>
                  </div>
                  <div className="text-lg font-bold">
                    ${plans[selectedUpgrade].price[billingCycle]}/{billingCycle === "monthly" ? "mo" : "yr"}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Important Information</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedUpgrade === "basic"
                        ? "Your plan will be downgraded immediately. You'll keep your remaining credits, but won't receive new premium features."
                        : "Your plan will be upgraded immediately. You'll be charged the prorated difference for the remainder of your billing cycle."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmUpgrade}>Confirm {selectedUpgrade === "basic" ? "Downgrade" : "Upgrade"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

