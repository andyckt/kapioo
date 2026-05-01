"use client"

import { useMemo, useState } from "react"
import { CreditCard, LogOut, Settings, ShoppingCart, Gem, Ticket } from "lucide-react"
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
import { useUserProfile } from "@/lib/dashboard-user-profile"
import { performClientLogout } from "@/lib/client-logout"
import { useLanguage } from "@/lib/language-context"
import { Badge } from "@/components/ui/badge"

export function UserNav({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const router = useRouter()
  const { toast } = useToast()
  const { t, language } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const { userData, upcomingDeliveries } = useUserProfile()

  const displayName = userData?.name || userData?.userID || "User"
  
  const handleLogout = async () => {
    await performClientLogout()

    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    })

    router.push("/login")
  }
  
  // Get initials for avatar
  const getInitials = (): string => {
    if (!displayName) return "U"

    const nameParts = displayName.trim().split(/\s+/)
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase()

    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase()
  }

  const avatarSrc = useMemo(() => {
    const initials = getInitials()
    const palette = [
      ["#C2884E", "#D1A46C"],
      ["#8B5E3C", "#C2884E"],
      ["#6B5F53", "#9A7B5F"],
      ["#A66C3D", "#D4A373"],
    ]
    const colorIndex =
      displayName.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length
    const [startColor, endColor] = palette[colorIndex]

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
        <defs>
          <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${startColor}" />
            <stop offset="100%" stop-color="${endColor}" />
          </linearGradient>
        </defs>
        <rect width="72" height="72" rx="36" fill="url(#avatarGradient)" />
        <text
          x="50%"
          y="50%"
          dy="0.35em"
          text-anchor="middle"
          fill="#FFFFFF"
          font-family="Inter, Arial, sans-serif"
          font-size="24"
          font-weight="700"
        >
          ${initials}
        </text>
      </svg>
    `.trim()

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }, [displayName])
  
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
            <AvatarImage src={avatarSrc} alt={displayName} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
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
                <span>{language === "en" ? "2-Dish Voucher" : "2菜餐券"}</span>
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
                <span>{language === "en" ? "3-Dish Voucher" : "3菜餐券"}</span>
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
                <span>{language === "en" ? "Upcoming Orders" : "待配送订单"}</span>
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

