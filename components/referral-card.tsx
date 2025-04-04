"use client"

import { useState } from "react"
import { Gift, Copy, Check, Share2 } from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export function ReferralCard() {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const referralCode = "MEALWEEK25"

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode)
    setCopied(true)
    toast({
      title: "Copied to clipboard",
      description: "Your referral code has been copied to clipboard",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const shareReferral = () => {
    // In a real app, this would open a share dialog
    toast({
      title: "Share with friends",
      description: "Sharing options would appear here",
    })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="bg-gradient-to-br from-primary/10 to-background border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Refer a Friend
          </CardTitle>
          <CardDescription>Give 5 credits, get 5 credits when they sign up</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground mb-2">
                Share this code with friends and you'll both receive 5 free credits when they sign up!
              </p>
              <div className="flex gap-2">
                <Input value={referralCode} readOnly className="font-mono text-center" />
                <Button size="icon" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-lg border p-4">
                <p className="text-3xl font-bold text-primary">5</p>
                <p className="text-sm text-muted-foreground">Friends Referred</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-3xl font-bold text-primary">25</p>
                <p className="text-sm text-muted-foreground">Credits Earned</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={shareReferral}>
            <Share2 className="mr-2 h-4 w-4" />
            Share with Friends
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

