"use client"

import { useState, useEffect } from "react"
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
  CheckCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export function AdminDashboardEnhanced() {
  const [period, setPeriod] = useState("week")
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // State for real metrics
  const [totalUsers, setTotalUsers] = useState(0)
  const [userGrowthRate, setUserGrowthRate] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [pendingOrdersGrowth, setPendingOrdersGrowth] = useState(0)
  const [deliveredOrders, setDeliveredOrders] = useState(0)
  const [deliveredOrdersGrowth, setDeliveredOrdersGrowth] = useState(0)
  const [popularDay, setPopularDay] = useState("")
  const [popularDayChange, setPopularDayChange] = useState(0)

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDashboardStats()
  }

  // Fetch dashboard statistics from backend
  const fetchDashboardStats = async () => {
    setLoading(true)
    try {
      // Fetch total users count
      const usersResponse = await fetch('/api/users/count');
      const usersData = await usersResponse.json();
      
      if (usersData.success) {
        setTotalUsers(usersData.data.total);
        setUserGrowthRate(usersData.data.growthRate || 0);
      }
      
      // Fetch order statistics
      const ordersResponse = await fetch('/api/orders/stats');
      const ordersData = await ordersResponse.json();
      
      if (ordersData.success) {
        setPendingOrders(ordersData.data.pendingOrders || 0);
        setPendingOrdersGrowth(ordersData.data.pendingOrdersGrowth || 0);
        setDeliveredOrders(ordersData.data.deliveredOrders || 0);
        setDeliveredOrdersGrowth(ordersData.data.deliveredOrdersGrowth || 0);
        setPopularDay(ordersData.data.popularDay || "Monday");
        setPopularDayChange(ordersData.data.popularDayChange || 0);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch data on initial load and when period changes
  useEffect(() => {
    fetchDashboardStats();
  }, [period]); // Add period as dependency to refresh data when period changes
  
  // Handle export dashboard data to CSV
  const handleExport = () => {
    try {
      // Create the CSV content
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Add headers
      csvContent += "Metric,Value,Change\n";
      
      // Add KPI metrics data
      csvContent += `Total Users,${totalUsers},${userGrowthRate}%\n`;
      csvContent += `Pending Orders,${pendingOrders},${pendingOrdersGrowth}%\n`;
      csvContent += `Successfully Delivered,${deliveredOrders},${deliveredOrdersGrowth}%\n`;
      csvContent += `Popular Day,${popularDay},${popularDayChange}%\n`;
      
      // Add chart data header based on current period
      csvContent += `\n${period.charAt(0).toUpperCase() + period.slice(1)} Data\n`;
      
      // Add pending orders data
      csvContent += "\nPending Orders\n";
      csvContent += "Date,Count\n";
      pendingOrdersData[period as keyof typeof pendingOrdersData].forEach(item => {
        csvContent += `${item.name},${item.pending}\n`;
      });
      
      // Add delivered orders data
      csvContent += "\nDelivered Orders\n";
      csvContent += "Date,Count\n";
      deliveredOrdersData[period as keyof typeof deliveredOrdersData].forEach(item => {
        csvContent += `${item.name},${item.delivered}\n`;
      });
      
      // Add user growth data
      csvContent += "\nNew Users\n";
      csvContent += "Date,Count\n";
      userGrowthData[period as keyof typeof userGrowthData].forEach(item => {
        csvContent += `${item.name},${item.users}\n`;
      });
      
      // Create a download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `dashboard-${period}-data.csv`);
      document.body.appendChild(link);
      
      // Trigger download and clean up
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting dashboard data:", error);
    }
  };

  // Sample data for charts - Update to have pending and delivered orders data
  const pendingOrdersData = {
    week: [
      { name: "Mon", pending: 12 },
      { name: "Tue", pending: 9 },
      { name: "Wed", pending: 15 },
      { name: "Thu", pending: 10 },
      { name: "Fri", pending: 18 },
      { name: "Sat", pending: 8 },
      { name: "Sun", pending: 6 },
    ],
    month: [
      { name: "Week 1", pending: 45 },
      { name: "Week 2", pending: 52 },
      { name: "Week 3", pending: 63 },
      { name: "Week 4", pending: 70 },
    ],
    year: [
      { name: "Jan", pending: 120 },
      { name: "Feb", pending: 140 },
      { name: "Mar", pending: 160 },
      { name: "Apr", pending: 152 },
      { name: "May", pending: 180 },
      { name: "Jun", pending: 190 },
      { name: "Jul", pending: 210 },
      { name: "Aug", pending: 185 },
      { name: "Sep", pending: 195 },
      { name: "Oct", pending: 225 },
      { name: "Nov", pending: 240 },
      { name: "Dec", pending: 260 },
    ],
  }

  const deliveredOrdersData = {
    week: [
      { name: "Mon", delivered: 8 },
      { name: "Tue", delivered: 12 },
      { name: "Wed", delivered: 10 },
      { name: "Thu", delivered: 14 },
      { name: "Fri", delivered: 16 },
      { name: "Sat", delivered: 7 },
      { name: "Sun", delivered: 5 },
    ],
    month: [
      { name: "Week 1", delivered: 35 },
      { name: "Week 2", delivered: 42 },
      { name: "Week 3", delivered: 48 },
      { name: "Week 4", delivered: 55 },
    ],
    year: [
      { name: "Jan", delivered: 80 },
      { name: "Feb", delivered: 95 },
      { name: "Mar", delivered: 110 },
      { name: "Apr", delivered: 105 },
      { name: "May", delivered: 125 },
      { name: "Jun", delivered: 140 },
      { name: "Jul", delivered: 160 },
      { name: "Aug", delivered: 145 },
      { name: "Sep", delivered: 155 },
      { name: "Oct", delivered: 175 },
      { name: "Nov", delivered: 195 },
      { name: "Dec", delivered: 220 },
    ],
  }

  // Keep the existing userGrowthData
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

  // KPI metrics using real data
  const kpiMetrics = [
    {
      title: "Total Users",
      value: loading ? "..." : totalUsers,
      change: userGrowthRate,
      trend: userGrowthRate >= 0 ? "up" : "down",
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
      description: "Total registered users",
    },
    {
      title: "Pending Orders",
      value: loading ? "..." : pendingOrders,
      change: pendingOrdersGrowth,
      trend: pendingOrdersGrowth >= 0 ? "up" : "down",
      icon: <ShoppingCart className="h-4 w-4 text-muted-foreground" />,
      description: "Orders in pending status",
    },
    {
      title: "Successfully Delivered",
      value: loading ? "..." : deliveredOrders,
      change: deliveredOrdersGrowth,
      trend: deliveredOrdersGrowth >= 0 ? "up" : "down",
      icon: <CheckCircle className="h-4 w-4 text-muted-foreground" />,
      description: "Orders delivered successfully",
    },
    {
      title: "Popular Day",
      value: loading ? "..." : popularDay,
      change: popularDayChange,
      trend: popularDayChange >= 0 ? "up" : "down",
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
          <Button variant="outline" onClick={handleExport}>
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
                  {loading ? "..." : Math.abs(metric.change)}%
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
          <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">Pending Orders</TabsTrigger>
              <TabsTrigger value="delivered">Delivered Orders</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pendingOrdersData[period as keyof typeof pendingOrdersData]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="pending" fill="#0088FE" name="Pending Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            <TabsContent value="delivered" className="mt-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={deliveredOrdersData[period as keyof typeof deliveredOrdersData]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="delivered" stroke="#00C49F" strokeWidth={2} name="Delivered Orders" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            <TabsContent value="users" className="mt-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userGrowthData[period as keyof typeof userGrowthData]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="users" fill="#FFBB28" name="New Users" />
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

