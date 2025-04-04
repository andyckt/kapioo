"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Award, Gift, TrendingUp, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function LoyaltyProgram({ credits = 50, totalOrders = 12 }) {
  const [activeTab, setActiveTab] = useState("status")

  // Calculate loyalty tier based on total orders
  const getTier = () => {
    if (totalOrders >= 30) return { name: "Platinum", color: "bg-zinc-400", progress: 100 }
    if (totalOrders >= 20) return { name: "Gold", color: "bg-yellow-400", progress: 66 }
    if (totalOrders >= 10) return { name: "Silver", color: "bg-gray-400", progress: 33 }
    return { name: "Bronze", color: "bg-amber-700", progress: Math.min(totalOrders * 10, 100) }
  }

  const tier = getTier()

  const rewards = [
    {
      id: 1,
      name: "Free Delivery",
      description: "Get free delivery on your next order",
      cost: 10,
      icon: <Zap className="h-5 w-5" />,
    },
    {
      id: 2,
      name: "Premium Meal Upgrade",
      description: "Upgrade one meal to our premium selection",
      cost: 15,
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      id: 3,
      name: "Gift a Meal",
      description: "Send a free meal to a friend",
      cost: 20,
      icon: <Gift className="h-5 w-5" />,
    },
  ]

  const benefits = {
    Bronze: ["Basic meal selection", "Weekly promotions", "Email support"],
    Silver: ["All Bronze benefits", "Priority delivery", "Exclusive recipes", "Phone support"],
    Gold: ["All Silver benefits", "Free delivery", "Meal customization", "Priority support"],
    Platinum: ["All Gold benefits", "Personal meal consultant", "Early access to new meals", "VIP events"],
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Loyalty Program
            </CardTitle>
            <CardDescription>Earn rewards with every order</CardDescription>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${tier.color} text-white`}>{tier.name}</div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="benefits">Benefits</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to next tier</span>
                <span>
                  {totalOrders} /{" "}
                  {tier.name === "Platinum"
                    ? "30+"
                    : tier.name === "Gold"
                      ? "30"
                      : tier.name === "Silver"
                        ? "20"
                        : "10"}{" "}
                  orders
                </span>
              </div>
              <Progress value={tier.progress} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold text-primary">{totalOrders}</p>
                <p className="text-sm text-muted-foreground">Total Orders</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold text-primary">{credits}</p>
                <p className="text-sm text-muted-foreground">Available Credits</p>
              </div>
            </div>

            <div className="rounded-lg border p-4 mt-4">
              <h3 className="font-medium mb-2">Next Milestone</h3>
              {tier.name === "Platinum" ? (
                <p className="text-sm text-muted-foreground">
                  You've reached our highest tier! Enjoy all the premium benefits.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {tier.name === "Gold"
                    ? "Place 10 more orders to reach Platinum tier!"
                    : tier.name === "Silver"
                      ? "Place 10 more orders to reach Gold tier!"
                      : `Place ${10 - totalOrders} more orders to reach Silver tier!`}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="rewards" className="mt-4">
            <div className="space-y-4">
              {rewards.map((reward) => (
                <motion.div
                  key={reward.id}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {reward.icon}
                    </div>
                    <div>
                      <h3 className="font-medium">{reward.name}</h3>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>
                    </div>
                  </div>
                  <Button variant={credits >= reward.cost ? "default" : "outline"} disabled={credits < reward.cost}>
                    {reward.cost} Credits
                  </Button>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="benefits" className="mt-4">
            <div className="space-y-6">
              {Object.entries(benefits).map(([tierName, tierBenefits]) => (
                <div key={tierName} className="space-y-2">
                  <h3 className={`font-medium ${tierName === tier.name ? "text-primary" : ""}`}>
                    {tierName} Tier {tierName === tier.name && "(Current)"}
                  </h3>
                  <ul className="space-y-1">
                    {tierBenefits.map((benefit, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <div
                          className={`h-1.5 w-1.5 rounded-full ${tierName === tier.name ? "bg-primary" : "bg-muted-foreground"}`}
                        ></div>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          Learn More About Our Loyalty Program
        </Button>
      </CardFooter>
    </Card>
  )
}

