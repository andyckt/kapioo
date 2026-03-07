"use client"

import { useEffect, useState } from "react"
import { CreditCard, LogOut, Settings, User, ShoppingCart, Gem, Ticket } from "lucide-react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"

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
import { useLanguage } from "@/lib/language-context"
import { Badge } from "@/components/ui/badge"

export function UserNav({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const router = useRouter()
  const { toast } = useToast()
  const { t, language } = useLanguage()
  const [userData, setUserData] = useState<{ 
    name?: string; 
    email?: string; 
    userID?: string; 
    _id?: string;
    credits?: number;
    twoDishVoucher?: number;
    threeDishVoucher?: number;
    weeklySIXmeals?: number;
    weeklyEIGHTmeals?: number;
    weeklyTENmeals?: number;
    weeklyTWELVEmeals?: number;
  } | null>(null)
  const [upcomingDeliveries, setUpcomingDeliveries] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  
  useEffect(() => {
    // Get user data from localStorage when component mounts
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setUserData(user)
        
        // If user has _id, fetch complete user data with credits and vouchers
        if (user && user._id) {
          fetchUserData(user._id)
          fetchOrderStats(user._id)
        }
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
  }, [])
  
  // Fetch data when dropdown is opened
  useEffect(() => {
    if (isOpen && userData?._id) {
      fetchUserData(userData._id)
      fetchOrderStats(userData._id)
    }
  }, [isOpen])
  
  // Fetch complete user data including credits and vouchers
  const fetchUserData = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        // Update userData with credits and vouchers
        setUserData(prevData => ({
          ...prevData,
          credits: data.data.credits,
          twoDishVoucher: data.data.twoDishVoucher,
          threeDishVoucher: data.data.threeDishVoucher,
          weeklySIXmeals: data.data.weeklySIXmeals,
          weeklyEIGHTmeals: data.data.weeklyEIGHTmeals,
          weeklyTENmeals: data.data.weeklyTENmeals,
          weeklyTWELVEmeals: data.data.weeklyTWELVEmeals
        }))
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }
  
  // Fetch order statistics
  const fetchOrderStats = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/orders/count`)
      const data = await response.json()
      
      if (data.success && data.data) {
        setUpcomingDeliveries(data.data.upcomingDeliveries)
      }
    } catch (error) {
      console.error('Error fetching order statistics:', error)
    }
  }
  
  const handleLogout = async () => {
    await fetch('/api/auth/admin-mfa', { method: 'DELETE' }).catch(() => undefined)
    localStorage.removeItem('user')
    localStorage.removeItem('isAuthenticated')

    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    })

    await signOut({ redirect: false })
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
    // { label: "Profile", icon: <User className="mr-2 h-4 w-4" />, tab: "profile" },
    // Removed credits option
    { label: t('settings'), icon: <Settings className="mr-2 h-4 w-4" />, tab: "settings" },
  ]

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={`https://ui-avatars.com/api/?name=${userData?.name || 'User'}&background=random`} alt={userData?.name || 'User'} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userData?.name || userData?.userID || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">{userData?.email || ''}</p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {/* User Stats Section */}
        <div className="px-2 py-1.5 space-y-1.5">
          {/* Weekly meal plans */}
          {(userData as any)?.weeklySIXmeals > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Gem className="mr-2 h-4 w-4 text-amber-500" />
                <span>{language === 'en' ? '6 meals/week' : '6餐一周'}</span>
              </div>
              <Badge variant="outline" className="ml-auto font-medium">
                {(userData as any)?.weeklySIXmeals}{language === 'en' ? '' : '张'}
              </Badge>
            </div>
          )}
          
          {(userData as any)?.weeklyEIGHTmeals > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Gem className="mr-2 h-4 w-4 text-amber-500" />
                <span>{language === 'en' ? '8 meals/week' : '8餐一周'}</span>
              </div>
              <Badge variant="outline" className="ml-auto font-medium">
                {(userData as any)?.weeklyEIGHTmeals}{language === 'en' ? '' : '张'}
              </Badge>
            </div>
          )}
          
          {(userData as any)?.weeklyTENmeals > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Gem className="mr-2 h-4 w-4 text-amber-500" />
                <span>{language === 'en' ? '10 meals/week' : '10餐一周'}</span>
              </div>
              <Badge variant="outline" className="ml-auto font-medium">
                {(userData as any)?.weeklyTENmeals}{language === 'en' ? '' : '张'}
              </Badge>
            </div>
          )}
          
          {(userData as any)?.weeklyTWELVEmeals > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Gem className="mr-2 h-4 w-4 text-amber-500" />
                <span>{language === 'en' ? '12 meals/week' : '12餐一周'}</span>
              </div>
              <Badge variant="outline" className="ml-auto font-medium">
                {(userData as any)?.weeklyTWELVEmeals}{language === 'en' ? '' : '张'}
              </Badge>
            </div>
          )}
          
          {/* 2-Dish Vouchers */}
          {userData?.twoDishVoucher !== undefined && userData.twoDishVoucher > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Ticket className="mr-2 h-4 w-4 text-green-500" />
                <span>2菜餐券</span>
              </div>
              <Badge variant="outline" className="ml-auto font-medium">
                {userData.twoDishVoucher}
              </Badge>
            </div>
          )}
          
          {/* 3-Dish Vouchers */}
          {userData?.threeDishVoucher !== undefined && userData.threeDishVoucher > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Ticket className="mr-2 h-4 w-4 text-blue-500" />
                <span>3菜餐券</span>
              </div>
              <Badge variant="outline" className="ml-auto font-medium">
                {userData.threeDishVoucher}
              </Badge>
            </div>
          )}
          
          {/* Upcoming Orders */}
          {upcomingDeliveries > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <ShoppingCart className="mr-2 h-4 w-4 text-purple-500" />
                <span>待配送订单</span>
              </div>
              <Badge variant="outline" className="ml-auto font-medium">
                {upcomingDeliveries}
              </Badge>
            </div>
          )}
        </div>
        
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
          <span>{t('logOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

