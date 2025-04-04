"use client"

import { useState } from "react"
import {
  Eye,
  ZoomIn,
  ZoomOut,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Keyboard,
  MousePointer,
  Check,
  Sliders,
  Accessibility,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function AccessibilityFeatures() {
  const [activeTab, setActiveTab] = useState("visual")
  const [highContrast, setHighContrast] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [textToSpeech, setTextToSpeech] = useState(false)
  const [keyboardNavigation, setKeyboardNavigation] = useState(true)
  const [fontSize, setFontSize] = useState(100)
  const [fontFamily, setFontFamily] = useState("system-ui")
  const [colorMode, setColorMode] = useState("system")
  const { toast } = useToast()

  const handleSaveSettings = () => {
    toast({
      title: "Accessibility settings saved",
      description: "Your preferences have been updated",
    })
  }

  const handleResetSettings = () => {
    setHighContrast(false)
    setReducedMotion(false)
    setTextToSpeech(false)
    setKeyboardNavigation(true)
    setFontSize(100)
    setFontFamily("system-ui")
    setColorMode("system")

    toast({
      title: "Settings reset",
      description: "Accessibility settings have been reset to defaults",
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Accessibility className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Accessibility Settings</CardTitle>
              <CardDescription>Customize your experience for better accessibility</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="visual" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="visual">
              <Eye className="h-4 w-4 mr-2" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="audio">
              <Volume2 className="h-4 w-4 mr-2" />
              Audio & Speech
            </TabsTrigger>
            <TabsTrigger value="input">
              <Keyboard className="h-4 w-4 mr-2" />
              Input & Navigation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="high-contrast">High Contrast Mode</Label>
                  <p className="text-sm text-muted-foreground">Increase contrast for better text visibility</p>
                </div>
                <Switch id="high-contrast" checked={highContrast} onCheckedChange={setHighContrast} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="reduced-motion">Reduced Motion</Label>
                  <p className="text-sm text-muted-foreground">Minimize animations and transitions</p>
                </div>
                <Switch id="reduced-motion" checked={reducedMotion} onCheckedChange={setReducedMotion} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="font-size">Font Size ({fontSize}%)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setFontSize(Math.max(70, fontSize - 10))}
                      disabled={fontSize <= 70}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setFontSize(Math.min(200, fontSize + 10))}
                      disabled={fontSize >= 200}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Slider
                  id="font-size"
                  min={70}
                  max={200}
                  step={10}
                  value={[fontSize]}
                  onValueChange={(value) => setFontSize(value[0])}
                />
                <div className="mt-4 p-4 border rounded-md">
                  <p className={`${fontSize === 100 ? "" : `text-[${fontSize}%]`}`}>
                    This is a sample text to preview your font size setting.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="font-family">Font Family</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger id="font-family">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system-ui">System Default</SelectItem>
                    <SelectItem value="sans-serif">Sans Serif</SelectItem>
                    <SelectItem value="serif">Serif</SelectItem>
                    <SelectItem value="monospace">Monospace</SelectItem>
                    <SelectItem value="dyslexic">Dyslexic Friendly</SelectItem>
                  </SelectContent>
                </Select>
                <div className="mt-4 p-4 border rounded-md">
                  <p style={{ fontFamily: fontFamily === "dyslexic" ? "Comic Sans MS, cursive" : fontFamily }}>
                    This is a sample text to preview your font family setting.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color-mode">Color Mode</Label>
                <Select value={colorMode} onValueChange={setColorMode}>
                  <SelectTrigger id="color-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        <span>Light</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        <span>Dark</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Sliders className="h-4 w-4" />
                        <span>System</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audio" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="text-to-speech">Text-to-Speech</Label>
                  <p className="text-sm text-muted-foreground">Read text content aloud</p>
                </div>
                <Switch id="text-to-speech" checked={textToSpeech} onCheckedChange={setTextToSpeech} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="speech-rate">Speech Rate</Label>
                <Slider id="speech-rate" min={0.5} max={2} step={0.1} defaultValue={[1]} disabled={!textToSpeech} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Slower</span>
                  <span>Normal</span>
                  <span>Faster</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-select">Voice</Label>
                <Select defaultValue="default" disabled={!textToSpeech}>
                  <SelectTrigger id="voice-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">System Default</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4 p-4 border rounded-md">
                <div className="flex items-center justify-between">
                  <p className="text-sm">Test text-to-speech functionality</p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!textToSpeech}
                    onClick={() => {
                      toast({
                        title: "Text-to-Speech",
                        description: "This is a test of the text-to-speech functionality",
                      })
                    }}
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Test Speech
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Audio Notifications</h3>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notification-volume">Notification Volume</Label>
                  <div className="flex items-center gap-2">
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                    <Slider id="notification-volume" className="w-[100px]" defaultValue={[70]} />
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch id="order-notifications" defaultChecked />
                  <Label htmlFor="order-notifications">Order Updates</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="message-notifications" defaultChecked />
                  <Label htmlFor="message-notifications">New Messages</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="promotion-notifications" defaultChecked={false} />
                  <Label htmlFor="promotion-notifications">Promotions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="reminder-notifications" defaultChecked />
                  <Label htmlFor="reminder-notifications">Reminders</Label>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="input" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="keyboard-navigation">Keyboard Navigation</Label>
                  <p className="text-sm text-muted-foreground">Navigate using keyboard shortcuts</p>
                </div>
                <Switch id="keyboard-navigation" checked={keyboardNavigation} onCheckedChange={setKeyboardNavigation} />
              </div>

              {keyboardNavigation && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-sm font-medium">Keyboard Shortcuts</h3>
                  <div className="rounded-md border divide-y">
                    <div className="flex items-center justify-between p-2">
                      <span className="text-sm">Navigate menu items</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted rounded border">
                          Tab
                        </kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2">
                      <span className="text-sm">Select an item</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted rounded border">
                          Enter
                        </kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2">
                      <span className="text-sm">Go back</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted rounded border">
                          Esc
                        </kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2">
                      <span className="text-sm">Search</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted rounded border">
                          Ctrl
                        </kbd>
                        <span>+</span>
                        <kbd className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted rounded border">
                          K
                        </kbd>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="focus-indicators">Focus Indicators</Label>
                  <p className="text-sm text-muted-foreground">Show visible focus indicators when navigating</p>
                </div>
                <Switch id="focus-indicators" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-focus">Auto-Focus</Label>
                  <p className="text-sm text-muted-foreground">Automatically focus on main content when page loads</p>
                </div>
                <Switch id="auto-focus" defaultChecked />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Mouse Settings</h3>

              <div className="space-y-2">
                <Label htmlFor="cursor-size">Cursor Size</Label>
                <Select defaultValue="default">
                  <SelectTrigger id="cursor-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="x-large">Extra Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="click-assist">Click Assistance</Label>
                  <p className="text-sm text-muted-foreground">Provide larger click targets for buttons and links</p>
                </div>
                <Switch id="click-assist" defaultChecked={false} />
              </div>

              <div className="mt-4 p-4 border rounded-md">
                <div className="flex items-center justify-between">
                  <p className="text-sm">Test focus and click indicators</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <MousePointer className="h-4 w-4 mr-2" />
                      Test Button
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleResetSettings}>
          Reset to Defaults
        </Button>
        <Button onClick={handleSaveSettings}>
          <Check className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  )
}

