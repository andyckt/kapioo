"use client"

import React, { useState } from 'react'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Check, MapPin } from 'lucide-react'
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language-context'
import { useToast } from '@/hooks/use-toast'

// Define the supported regions for daily delivery
const DAILY_DELIVERY_REGIONS = [
  "Downtown",
  "Midtown", 
  "NorthYork", 
  "Markham", 
  "RichmondHill"
]

interface RegionCheckDialogRechargeProps {
  open: boolean
  onClose: () => void
  currentRegion: string | undefined
  onRegionChange: (region: string) => Promise<void>
  onProceed: () => void
}

export function RegionCheckDialogRecharge({
  open,
  onClose,
  currentRegion,
  onRegionChange,
  onProceed
}: RegionCheckDialogRechargeProps) {
  const { language } = useLanguage()
  const { toast } = useToast()
  const [selectedRegion, setSelectedRegion] = useState<string>("")
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleRegionChange = async () => {
    if (!selectedRegion) {
      toast({
        title: language === 'zh' ? "请选择区域" : "Please select a region",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      await onRegionChange(selectedRegion)
      onClose() // Close the dialog first
      onProceed() // Then proceed with the flow
    } catch (error) {
      console.error('Error updating region:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 sm:border-[#C2884E]/10 shadow-xl rounded-xl sm:rounded-[24px]">
        <DialogHeader className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] p-4 sm:p-6 text-white h-[90px] flex flex-col justify-center">
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            区域服务提示
          </DialogTitle>
          <DialogDescription className="text-white/90 mt-1 sm:mt-2 text-sm sm:text-base font-light">
            每日直送服务区域限制
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-800 font-medium">
                  您当前选择的区域 <span className="font-bold">{currentRegion || "未设置"}</span> 不在每日直送服务范围内
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  每日直送服务目前仅限于以下区域：Downtown、Midtown、North York、Markham、Richmond Hill
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#6B5F53]">
              请选择一个可提供服务的区域：
            </label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {selectedRegion || "选择区域..."}
                  <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-full">
                <Command>
                  <CommandInput placeholder="搜索区域..." />
                  <CommandList>
                    <CommandEmpty>未找到匹配的区域</CommandEmpty>
                    <CommandGroup>
                      {DAILY_DELIVERY_REGIONS.map((region) => (
                        <CommandItem
                          key={region}
                          value={region}
                          onSelect={() => {
                            setSelectedRegion(region)
                            setPopoverOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedRegion === region ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {region}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-[#C2884E]/10">
            <Button variant="outline" onClick={onClose}>
              {language === 'zh' ? '取消' : 'Cancel'}
            </Button>
            <Button 
              className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white"
              onClick={handleRegionChange}
              disabled={!selectedRegion || isLoading}
            >
              {isLoading ? 
                (language === 'zh' ? '处理中...' : 'Processing...') : 
                (language === 'zh' ? '确认' : 'Confirm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
