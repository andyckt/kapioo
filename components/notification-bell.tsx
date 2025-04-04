"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function NotificationBell() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Your meal is on the way!",
      description: "Your Monday meal will be delivered today between 11am-1pm.",
      time: "10 minutes ago",
      read: false,
    },
    {
      id: 2,
      title: "Credits added",
      description: "10 credits have been added to your account.",
      time: "2 hours ago",
      read: false,
    },
    {
      id: 3,
      title: "New meal available",
      description: "Check out our new Teriyaki Salmon Bowl for next week!",
      time: "Yesterday",
      read: true,
    },
  ])

  const [open, setOpen] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })))
  }

  const removeNotification = (id) => {
    setNotifications(notifications.filter((n) => n.id !== id))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-medium">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-auto">
          <AnimatePresence>
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-4 border-b last:border-0 ${!notification.read ? "bg-muted/50" : ""}`}
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <h5 className="font-medium text-sm">{notification.title}</h5>
                      <p className="text-sm text-muted-foreground">{notification.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeNotification(notification.id)}
                    >
                      <span className="sr-only">Dismiss</span>
                      <span aria-hidden="true">×</span>
                    </Button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
            )}
          </AnimatePresence>
        </div>
      </PopoverContent>
    </Popover>
  )
}

