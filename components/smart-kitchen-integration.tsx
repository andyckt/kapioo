"use client"

import { useState } from "react"
import {
  Refrigerator,
  Smartphone,
  Wifi,
  WifiOff,
  Plus,
  Minus,
  ThermometerSnowflake,
  Utensils,
  ShoppingCart,
  Scan,
  QrCode,
  RefreshCw,
  Check,
  AlertTriangle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function SmartKitchenIntegration() {
  const [activeTab, setActiveTab] = useState("inventory")
  const [isConnected, setIsConnected] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [showAddDevice, setShowAddDevice] = useState(false)
  const { toast } = useToast()

  // Mock inventory data
  const [inventory, setInventory] = useState([
    { id: 1, name: "Chicken Breast", quantity: 2, unit: "pcs", expiresIn: 3, lowStock: false },
    { id: 2, name: "Spinach", quantity: 1, unit: "bag", expiresIn: 2, lowStock: true },
    { id: 3, name: "Eggs", quantity: 8, unit: "pcs", expiresIn: 14, lowStock: false },
    { id: 4, name: "Milk", quantity: 1, unit: "carton", expiresIn: 5, lowStock: false },
    { id: 5, name: "Apples", quantity: 3, unit: "pcs", expiresIn: 7, lowStock: false },
    { id: 6, name: "Greek Yogurt", quantity: 1, unit: "container", expiresIn: 4, lowStock: false },
  ])

  // Mock connected devices
  const [devices, setDevices] = useState([
    { id: 1, name: "Smart Refrigerator", type: "refrigerator", connected: true, batteryLevel: 85 },
    { id: 2, name: "Smart Scale", type: "scale", connected: true, batteryLevel: 72 },
  ])

  // Mock shopping list
  const [shoppingList, setShoppingList] = useState([
    { id: 1, name: "Broccoli", quantity: 1, unit: "head", added: true },
    { id: 2, name: "Brown Rice", quantity: 1, unit: "bag", added: true },
    { id: 3, name: "Salmon Fillets", quantity: 2, unit: "pcs", added: false },
  ])

  const handleRefreshInventory = () => {
    toast({
      title: "Inventory refreshed",
      description: "Your inventory has been updated from your smart devices",
    })
  }

  const handleAddToShoppingList = (item) => {
    setShoppingList([...shoppingList, { id: Date.now(), name: item.name, quantity: 1, unit: item.unit, added: false }])

    toast({
      title: "Added to shopping list",
      description: `${item.name} has been added to your shopping list`,
    })
  }

  const handleRemoveFromInventory = (itemId) => {
    setInventory(inventory.filter((item) => item.id !== itemId))

    toast({
      title: "Item removed",
      description: "Item has been removed from your inventory",
    })
  }

  const handleToggleShoppingItem = (itemId) => {
    setShoppingList(shoppingList.map((item) => (item.id === itemId ? { ...item, added: !item.added } : item)))
  }

  const handleRemoveShoppingItem = (itemId) => {
    setShoppingList(shoppingList.filter((item) => item.id !== itemId))
  }

  const handleAddDevice = () => {
    setIsScanning(true)

    // Simulate scanning delay
    setTimeout(() => {
      setIsScanning(false)
      setShowAddDevice(false)

      setDevices([
        ...devices,
        { id: Date.now(), name: "Smart Food Container", type: "container", connected: true, batteryLevel: 100 },
      ])

      toast({
        title: "Device connected",
        description: "Smart Food Container has been added to your kitchen",
      })
    }, 3000)
  }

  const handleToggleConnection = () => {
    setIsConnected(!isConnected)

    toast({
      title: isConnected ? "Disconnected" : "Connected",
      description: isConnected
        ? "Your smart kitchen devices have been disconnected"
        : "Your smart kitchen devices have been connected",
    })
  }

  const getDeviceIcon = (type) => {
    switch (type) {
      case "refrigerator":
        return <Refrigerator className="h-4 w-4" />
      case "scale":
        return <Utensils className="h-4 w-4" />
      case "container":
        return <ThermometerSnowflake className="h-4 w-4" />
      default:
        return <Smartphone className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Refrigerator className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Smart Kitchen</CardTitle>
              <CardDescription>Manage your connected kitchen devices and inventory</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "destructive"} className="gap-1">
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            <Switch checked={isConnected} onCheckedChange={handleToggleConnection} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="inventory" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="shopping">Shopping List</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Current Inventory</h3>
              <Button variant="outline" size="sm" onClick={handleRefreshInventory}>
                <RefreshCw className="h-3 w-3 mr-2" />
                Refresh
              </Button>
            </div>

            {inventory.length > 0 ? (
              <div className="space-y-2">
                {inventory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{item.name}</span>
                        {item.lowStock && (
                          <Badge
                            variant="outline"
                            className="text-amber-500 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 text-[10px]"
                          >
                            Low Stock
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {item.quantity} {item.unit}
                        </span>
                        <span>•</span>
                        <span className={item.expiresIn <= 2 ? "text-red-500" : ""}>
                          Expires in {item.expiresIn} days
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleAddToShoppingList(item)}
                      >
                        <ShoppingCart className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveFromInventory(item.id)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <Refrigerator className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Your inventory is empty</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Connect your smart devices to track your inventory
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="devices" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Connected Devices</h3>
              <Dialog open={showAddDevice} onOpenChange={setShowAddDevice}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-3 w-3 mr-2" />
                    Add Device
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Smart Kitchen Device</DialogTitle>
                    <DialogDescription>Scan the QR code on your device to connect it to your kitchen</DialogDescription>
                  </DialogHeader>

                  <div className="flex flex-col items-center justify-center py-6">
                    {isScanning ? (
                      <div className="text-center">
                        <div className="relative inline-flex">
                          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20"></div>
                          <div className="relative rounded-full bg-primary p-4">
                            <Scan className="h-6 w-6 text-primary-foreground" />
                          </div>
                        </div>
                        <p className="mt-4 text-sm font-medium">Scanning for devices...</p>
                        <p className="text-xs text-muted-foreground">Make sure your device is in pairing mode</p>
                      </div>
                    ) : (
                      <>
                        <QrCode className="h-32 w-32 text-primary mb-4" />
                        <p className="text-sm text-center">
                          Open your device's app and scan this code, or put your device in pairing mode and click
                          "Connect"
                        </p>
                      </>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDevice(false)} disabled={isScanning}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddDevice} disabled={isScanning}>
                      {isScanning ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        "Connect"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {devices.length > 0 ? (
              <div className="space-y-3">
                {devices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">{getDeviceIcon(device.type)}</div>
                      <div>
                        <div className="font-medium text-sm">{device.name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${device.connected ? "text-green-500" : "text-red-500"}`}
                          >
                            {device.connected ? "Connected" : "Disconnected"}
                          </Badge>
                          <span>Battery: {device.batteryLevel}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        Settings
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <Smartphone className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No devices connected</h3>
                  <p className="text-sm text-muted-foreground mt-1">Add a smart device to get started</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="shopping" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Shopping List</h3>
              <Button variant="outline" size="sm">
                <Plus className="h-3 w-3 mr-2" />
                Add Item
              </Button>
            </div>

            {shoppingList.length > 0 ? (
              <div className="space-y-2">
                {shoppingList.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-2 flex-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className={`h-6 w-6 rounded-full ${item.added ? "bg-primary text-primary-foreground" : ""}`}
                        onClick={() => handleToggleShoppingItem(item.id)}
                      >
                        {item.added && <Check className="h-3 w-3" />}
                      </Button>
                      <div className={`${item.added ? "line-through text-muted-foreground" : ""}`}>
                        <span className="text-sm">{item.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveShoppingItem(item.id)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Your shopping list is empty</h3>
                  <p className="text-sm text-muted-foreground mt-1">Add items from your inventory or manually</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {isConnected ? (
            "Connected to your smart kitchen devices"
          ) : (
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Disconnected from your smart kitchen devices
            </span>
          )}
        </div>
        <Button variant="link" size="sm" className="text-xs">
          Manage Integrations
        </Button>
      </CardFooter>
    </Card>
  )
}

