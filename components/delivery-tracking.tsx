"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { MapPin, Check, Truck, Package, Home } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function DeliveryTracking({ orderId = "ORD-1001", estimatedDelivery = "Today, 12:00 PM - 2:00 PM" }) {
  // In a real app, this would be fetched from an API
  const [status, setStatus] = useState("out_for_delivery") // preparing, out_for_delivery, delivered

  const steps = [
    {
      id: "confirmed",
      title: "Order Confirmed",
      description: "Your order has been confirmed",
      icon: <Check className="h-5 w-5" />,
      time: "Today, 9:15 AM",
      completed: true,
    },
    {
      id: "preparing",
      title: "Preparing",
      description: "Your meals are being prepared",
      icon: <Package className="h-5 w-5" />,
      time: "Today, 10:30 AM",
      completed: true,
    },
    {
      id: "out_for_delivery",
      title: "Out for Delivery",
      description: "Your order is on its way",
      icon: <Truck className="h-5 w-5" />,
      time: "Today, 11:45 AM",
      completed: status === "out_for_delivery" || status === "delivered",
      active: status === "out_for_delivery",
    },
    {
      id: "delivered",
      title: "Delivered",
      description: "Your order has been delivered",
      icon: <Home className="h-5 w-5" />,
      time: "Estimated: Today, 12:00 PM - 2:00 PM",
      completed: status === "delivered",
    },
  ]

  // For demo purposes, let's simulate delivery progress
  const simulateDelivery = () => {
    if (status === "out_for_delivery") {
      setStatus("delivered")
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Delivery Tracking</CardTitle>
            <CardDescription>Track your meal delivery</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={simulateDelivery}>
            Simulate Delivery
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Order ID</div>
            <div className="font-medium">{orderId}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Estimated Delivery</div>
            <div className="font-medium">{estimatedDelivery}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="font-medium">
              {status === "preparing" && "Preparing"}
              {status === "out_for_delivery" && "Out for Delivery"}
              {status === "delivered" && "Delivered"}
            </div>
          </div>
        </div>

        <div className="relative">
          {/* Progress line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-muted" />

          {/* Steps */}
          <div className="space-y-8">
            {steps.map((step, index) => (
              <div key={step.id} className="relative">
                <motion.div
                  className={`absolute left-0 flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                    step.completed ? "border-primary bg-primary text-primary-foreground" : "border-muted bg-background"
                  } ${step.active ? "ring-4 ring-primary/20" : ""}`}
                  initial={false}
                  animate={step.completed ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  {step.icon}
                </motion.div>

                <div className="ml-16 space-y-1">
                  <div className="flex items-center">
                    <p className="font-medium">{step.title}</p>
                    {step.active && (
                      <span className="ml-2 inline-flex h-2 w-2 animate-pulse rounded-full bg-primary"></span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  <p className="text-xs text-muted-foreground">{step.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {status === "out_for_delivery" && (
          <div className="rounded-lg border p-4 bg-primary/5">
            <div className="flex items-start gap-4">
              <MapPin className="h-5 w-5 text-primary mt-1" />
              <div>
                <p className="font-medium">Your delivery is on the way!</p>
                <p className="text-sm text-muted-foreground">
                  Your delivery driver is about 15 minutes away. Make sure someone is available to receive your order.
                </p>
              </div>
            </div>
          </div>
        )}

        {status === "delivered" && (
          <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950">
            <div className="flex items-start gap-4">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-1" />
              <div>
                <p className="font-medium text-green-600 dark:text-green-400">Your order has been delivered!</p>
                <p className="text-sm text-muted-foreground">Enjoy your meal! Don't forget to rate your experience.</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

