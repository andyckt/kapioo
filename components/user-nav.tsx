"use client"

import { useEffect, useState } from "react"
import { CreditCard, LogOut, Settings, User } from "lucide-react"
import { useRouter } from "next/navigation"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

export function UserNav({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const router = useRouter()
  const { toast } = useToast()
  const [userData, setUserData] = useState<{ name?: string; email?: string; userID?: string } | null>(null)
  
  useEffect(() => {
    // Get user data from localStorage when component mounts
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setUserData(user)
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
  }, [])
  
  const handleLogout = () => {
    // Clear user data from localStorage
    localStorage.removeItem('user')
    
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    })
    
    router.push("/login")
  }
  
  // Get initials for avatar
  const getInitials = (): string => {
    if (!userData?.name) return "U"
    
    const nameParts = userData.name.split(' ')
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase()
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase()
  }
  
  const menuItems = [
    { label: "Profile", icon: <User className="mr-2 h-4 w-4" />, tab: "settings" },
    { label: "Credits", icon: <CreditCard className="mr-2 h-4 w-4" />, tab: "credits" },
    { label: "Settings", icon: <Settings className="mr-2 h-4 w-4" />, tab: "settings" },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={`https://ui-avatars.com/api/?name=${userData?.name || 'User'}&background=random`} alt={userData?.name || 'User'} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userData?.name || userData?.userID || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">{userData?.email || ''}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {menuItems.map((item) => (
            <DropdownMenuItem 
              key={item.tab}
              onClick={() => setActiveTab && setActiveTab(item.tab)}
            >
              {item.icon}
              <span>{item.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

