"use client"

import { useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AnalyticsChart() {
  const [period, setPeriod] = useState("week")

  const weekData = [
    { name: "Mon", orders: 32 },
    { name: "Tue", orders: 25 },
    { name: "Wed", orders: 40 },
    { name: "Thu", orders: 35 },
    { name: "Fri", orders: 45 },
    { name: "Sat", orders: 20 },
    { name: "Sun", orders: 15 },
  ]

  const monthData = [
    { name: "Week 1", orders: 120 },
    { name: "Week 2", orders: 145 },
    { name: "Week 3", orders: 160 },
    { name: "Week 4", orders: 180 },
  ]

  const yearData = [
    { name: "Jan", orders: 450 },
    { name: "Feb", orders: 520 },
    { name: "Mar", orders: 600 },
    { name: "Apr", orders: 580 },
    { name: "May", orders: 650 },
    { name: "Jun", orders: 700 },
    { name: "Jul", orders: 720 },
    { name: "Aug", orders: 680 },
    { name: "Sep", orders: 720 },
    { name: "Oct", orders: 750 },
    { name: "Nov", orders: 800 },
    { name: "Dec", orders: 850 },
  ]

  const data = {
    week: weekData,
    month: monthData,
    year: yearData,
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Order Analytics</CardTitle>
          <Tabs defaultValue="week" onValueChange={setPeriod}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <CardDescription>Number of orders over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data[period]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

