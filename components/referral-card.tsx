"use client"

import { useState, useEffect } from "react"
import { Gift, Copy, Check, Share2, User, Sparkles, Twitter, Facebook, Mail } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function ReferralCard() {
  const [copied, setCopied] = useState(false)
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [referralStats, setReferralStats] = useState({ count: 0, credits: 0 })
  const { toast } = useToast()
  
  // Get user-specific referral code from localStorage if available
  const [referralCode, setReferralCode] = useState("MEALWEEK25")
  
  useEffect(() => {
    // In a real app, we would fetch the user's actual referral stats
    // This is just for demo purposes
    const simulateReferralData = () => {
      const mockStats = {
        count: Math.floor(Math.random() * 10),
        credits: Math.floor(Math.random() * 50)
      }
      setReferralStats(mockStats)
    }
    
    simulateReferralData()
    
    // Try to get the user info from localStorage
    try {
      const userDataStr = localStorage.getItem('user')
      if (userDataStr) {
        const userData = JSON.parse(userDataStr)
        // Use a personalized code based on user data if available
        if (userData.name) {
          const namePart = userData.name.replace(/\s+/g, '').substring(0, 5).toUpperCase()
          setReferralCode(`${namePart}${Math.floor(1000 + Math.random() * 9000)}`)
        }
      }
    } catch (error) {
      console.error('Error getting user data:', error)
    }
  }, [])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode)
    setCopied(true)
    toast({
      title: "Copied to clipboard",
      description: "Your referral code has been copied to clipboard",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const shareReferral = (platform: string) => {
    const referralLink = `https://mealweek.com/signup?ref=${referralCode}`
    let shareUrl = ''
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=Get 5 free meal credits with my code: ${referralCode}&url=${encodeURIComponent(referralLink)}`
        break
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`
        break
      case 'email':
        shareUrl = `mailto:?subject=Join MealWeek and get 5 free credits&body=Hello! Sign up for MealWeek using my referral code: ${referralCode} and get 5 free credits. ${referralLink}`
        break
      default:
        // Default to copy link
        navigator.clipboard.writeText(referralLink)
        toast({
          title: "Link copied",
          description: "Referral link has been copied to clipboard",
        })
        return
    }
    
    // Open share URL in a new window
    if (shareUrl) {
      window.open(shareUrl, '_blank')
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5 }}
      className="relative"
    >
      <Card className="bg-gradient-to-br from-primary/10 to-background border-primary/20 overflow-hidden">
        <motion.div 
          className="absolute top-0 right-0 w-32 h-32 opacity-10" 
          initial={{ opacity: 0, x: 20, y: -20 }}
          animate={{ opacity: 0.1, x: 0, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          <Gift className="w-full h-full text-primary stroke-[0.5]" />
        </motion.div>
        
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Gift className="h-5 w-5 text-primary" />
            Refer a Friend
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">Give 5 credits, get 5 credits when they sign up</CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            <div className="rounded-lg bg-muted/70 backdrop-blur-sm p-3 sm:p-4 border border-primary/10">
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                Share this code with friends and you'll both receive 5 free credits when they sign up!
              </p>
              <div className="flex gap-2">
                <Input 
                  value={referralCode} 
                  readOnly 
                  className="font-mono text-center bg-background/50" 
                />
                <Button size="icon" className="aspect-square relative" onClick={copyToClipboard}>
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div
                        key="check"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <Check className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <Copy className="h-4 w-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <motion.div 
                className="rounded-lg border p-3 sm:p-4 relative overflow-hidden"
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <div className="relative z-10">
                  <p className="text-2xl sm:text-3xl font-bold text-primary">{referralStats.count}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Friends Referred</p>
                </div>
                <User className="absolute -bottom-4 -right-4 h-16 w-16 text-primary/10" />
              </motion.div>
              
              <motion.div 
                className="rounded-lg border p-3 sm:p-4 relative overflow-hidden"
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <div className="relative z-10">
                  <p className="text-2xl sm:text-3xl font-bold text-primary">{referralStats.credits}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Credits Earned</p>
                </div>
                <Sparkles className="absolute -bottom-4 -right-4 h-16 w-16 text-primary/10" />
              </motion.div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Popover open={showShareOptions} onOpenChange={setShowShareOptions}>
            <PopoverTrigger asChild>
              <Button className="w-full sm:w-auto" onClick={() => setShowShareOptions(true)}>
                <Share2 className="mr-2 h-4 w-4" />
                Share with Friends
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-3" align="center">
              <div className="grid grid-cols-3 gap-2 text-center">
                <Button 
                  onClick={() => shareReferral('twitter')} 
                  variant="outline" 
                  size="sm" 
                  className="flex flex-col items-center h-auto py-2 px-1"
                >
                  <Twitter className="h-5 w-5 mb-1 text-[#1DA1F2]" />
                  <span className="text-xs">Twitter</span>
                </Button>
                <Button 
                  onClick={() => shareReferral('facebook')} 
                  variant="outline" 
                  size="sm"
                  className="flex flex-col items-center h-auto py-2 px-1"
                >
                  <Facebook className="h-5 w-5 mb-1 text-[#4267B2]" />
                  <span className="text-xs">Facebook</span>
                </Button>
                <Button 
                  onClick={() => shareReferral('email')} 
                  variant="outline" 
                  size="sm"
                  className="flex flex-col items-center h-auto py-2 px-1"
                >
                  <Mail className="h-5 w-5 mb-1 text-primary" />
                  <span className="text-xs">Email</span>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="outline" 
            className="w-full sm:w-auto"
            onClick={() => shareReferral('copy')}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Link
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

