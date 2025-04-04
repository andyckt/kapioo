"use client"

import { useState } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  Users,
  CreditCard,
  ShoppingCart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export function AdminDashboardEnhanced() {
  const [period, setPeriod] = useState("week")
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
    }, 1500)
  }

  // Sample data for charts
  const revenueData = {
    week: [
      { name: "Mon", revenue: 1200 },
      { name: "Tue", revenue: 1400 },
      { name: "Wed", revenue: 1300 },
      { name: "Thu", revenue: 1500 },
      { name: "Fri", revenue: 1800 },
      { name: "Sat", revenue: 1600 },
      { name: "Sun", revenue: 1200 },
    ],
    month: [
      { name: "Week 1", revenue: 8500 },
      { name: "Week 2", revenue: 9200 },
      { name: "Week 3", revenue: 10500 },
      { name: "Week 4", revenue: 11800 },
    ],
    year: [
      { name: "Jan", revenue: 35000 },
      { name: "Feb", revenue: 38000 },
      { name: "Mar", revenue: 42000 },
      { name: "Apr", revenue: 40000 },
      { name: "May", revenue: 45000 },
      { name: "Jun", revenue: 48000 },
      { name: "Jul", revenue: 50000 },
      { name: "Aug", revenue: 52000 },
      { name: "Sep", revenue: 55000 },
      { name: "Oct", revenue: 58000 },
      { name: "Nov", revenue: 62000 },
      { name: "Dec", revenue: 68000 },
    ],
  }

  const orderData = {
    week: [
      { name: "Mon", orders: 32 },
      { name: "Tue", orders: 25 },
      { name: "Wed", orders: 40 },
      { name: "Thu", orders: 35 },
      { name: "Fri", orders: 45 },
      { name: "Sat", orders: 20 },
      { name: "Sun", orders: 15 },
    ],
    month: [
      { name: "Week 1", orders: 120 },
      { name: "Week 2", orders: 145 },
      { name: "Week 3", orders: 160 },
      { name: "Week 4", orders: 180 },
    ],
    year: [
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
    ],
  }

  const userGrowthData = {
    week: [
      { name: "Mon", users: 5 },
      { name: "Tue", users: 3 },
      { name: "Wed", users: 7 },
      { name: "Thu", users: 4 },
      { name: "Fri", users: 8 },
      { name: "Sat", users: 10 },
      { name: "Sun", users: 6 },
    ],
    month: [
      { name: "Week 1", users: 25 },
      { name: "Week 2", users: 32 },
      { name: "Week 3", users: 28 },
      { name: "Week 4", users: 35 },
    ],
    year: [
      { name: "Jan", users: 85 },
      { name: "Feb", users: 95 },
      { name: "Mar", users: 110 },
      { name: "Apr", users: 105 },
      { name: "May", users: 120 },
      { name: "Jun", users: 135 },
      { name: "Jul", users: 140 },
      { name: "Aug", users: 130 },
      { name: "Sep", users: 145 },
      { name: "Oct", users: 155 },
      { name: "Nov", users: 170 },
      { name: "Dec", users: 190 },
    ],
  }

  // KPI metrics
  const kpiMetrics = [
    {
      title: "Total Users",
      value: 1284,
      change: 12.5,
      trend: "up",
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
      description: "Total registered users",
    },
    {
      title: "Active Orders",
      value: 45,
      change: 8.3,
      trend: "up",
      icon: <ShoppingCart className="h-4 w-4 text-muted-foreground" />,
      description: "Orders for this week",
    },
    {
      title: "Revenue",
      value: "$12,450",
      change: 18.2,
      trend: "up",
      icon: <CreditCard className="h-4 w-4 text-muted-foreground" />,
      description: "Monthly revenue",
    },
    {
      title: "Popular Day",
      value: "Monday",
      change: -2.1,
      trend: "down",
      icon: <Calendar className="h-4 w-4 text-muted-foreground" />,
      description: "Most ordered day",
    },
  ]

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
        <div className="flex items-center gap-2">
          <Select defaultValue={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiMetrics.map((metric, index) => (
          <Card key={index} className="transform transition-all hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              {metric.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center mt-1">
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    metric.trend === "up"
                      ? "text-green-500 bg-green-50 dark:bg-green-950"
                      : "text-red-500 bg-red-50 dark:bg-red-950"
                  }`}
                >
                  {metric.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(metric.change)}%
                </Badge>
                <p className="text-xs text-muted-foreground ml-2">{metric.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Metrics Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Key business metrics over time</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="orders">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>
            <TabsContent value="orders" className="mt-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={orderData[period]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="orders" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            <TabsContent value="revenue" className="mt-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData[period]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#00C49F" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            <TabsContent value="users" className="mt-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userGrowthData[period]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="users" fill="#FFBB28" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

