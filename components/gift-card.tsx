"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Gift, Copy, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

export function GiftCard() {
  const [activeTab, setActiveTab] = useState("purchase")
  const [amount, setAmount] = useState("25")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [message, setMessage] = useState("")
  const [giftCardCode, setGiftCardCode] = useState("")
  const { toast } = useToast()

  const handlePurchase = () => {
    toast({
      title: "Gift card purchased",
      description: `A ${amount} credit gift card has been sent to ${recipientName}`,
    })
    setActiveTab("redeem")
    // In a real app, this would generate a real code
    setGiftCardCode("GIFT-" + Math.random().toString(36).substring(2, 10).toUpperCase())
  }

  const handleRedeem = () => {
    if (!giftCardCode) {
      toast({
        title: "Error",
        description: "Please enter a gift card code",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Gift card redeemed",
      description: "Credits have been added to your account",
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Gift Cards
        </CardTitle>
        <CardDescription>Purchase or redeem gift cards</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="purchase" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="purchase">Purchase</TabsTrigger>
            <TabsTrigger value="redeem">Redeem</TabsTrigger>
          </TabsList>

          <TabsContent value="purchase" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Gift Card Amount</Label>
                <RadioGroup
                  defaultValue="25"
                  value={amount}
                  onValueChange={setAmount}
                  className="grid grid-cols-3 gap-2"
                >
                  <div>
                    <RadioGroupItem value="25" id="amount-25" className="peer sr-only" />
                    <Label
                      htmlFor="amount-25"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <span className="text-xl font-bold">25</span>
                      <span className="text-sm">Credits</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="50" id="amount-50" className="peer sr-only" />
                    <Label
                      htmlFor="amount-50"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <span className="text-xl font-bold">50</span>
                      <span className="text-sm">Credits</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="100" id="amount-100" className="peer sr-only" />
                    <Label
                      htmlFor="amount-100"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <span className="text-xl font-bold">100</span>
                      <span className="text-sm">Credits</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient-name">Recipient's Name</Label>
                <Input
                  id="recipient-name"
                  placeholder="Enter recipient's name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient-email">Recipient's Email</Label>
                <Input
                  id="recipient-email"
                  type="email"
                  placeholder="Enter recipient's email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <textarea
                  id="message"
                  className="w-full min-h-[100px] p-2 border rounded-md"
                  placeholder="Add a personal message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="redeem" className="space-y-4 mt-4">
            {giftCardCode ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <div className="rounded-lg border p-6 bg-primary/5 text-center space-y-4">
                  <Gift className="h-12 w-12 mx-auto text-primary" />
                  <h3 className="text-xl font-bold">Gift Card Purchased!</h3>
                  <p className="text-sm text-muted-foreground">
                    Your gift card has been sent to {recipientName} at {recipientEmail}
                  </p>
                  <div className="bg-background rounded-md p-3 font-mono text-lg border">{giftCardCode}</div>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(giftCardCode)
                        toast({
                          title: "Copied to clipboard",
                          description: "Gift card code copied",
                        })
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" /> Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Email sent",
                          description: "Gift card code has been emailed to you",
                        })
                      }}
                    >
                      <Mail className="h-4 w-4 mr-1" /> Email
                    </Button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setGiftCardCode("")
                    setRecipientName("")
                    setRecipientEmail("")
                    setMessage("")
                    setAmount("25")
                    setActiveTab("purchase")
                  }}
                >
                  Purchase Another Gift Card
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gift-code">Gift Card Code</Label>
                  <Input
                    id="gift-code"
                    placeholder="Enter gift card code"
                    value={giftCardCode}
                    onChange={(e) => setGiftCardCode(e.target.value)}
                  />
                </div>

                <Button className="w-full" onClick={handleRedeem}>
                  Redeem Gift Card
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        {activeTab === "purchase" && !giftCardCode && (
          <Button className="w-full" onClick={handlePurchase} disabled={!recipientName || !recipientEmail}>
            Purchase Gift Card
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

