"use client"

import { Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type WeeklyLinkedGroupDisplayProps = {
  groupId: string
  className?: string
}

export function WeeklyLinkedGroupDisplay({ groupId, className }: WeeklyLinkedGroupDisplayProps) {
  const { toast } = useToast()

  const copyGroupId = async () => {
    try {
      await navigator.clipboard.writeText(groupId)
      toast({
        title: "Copied",
        description: "Group ID copied to clipboard.",
      })
    } catch {
      toast({
        title: "Could not copy",
        description: "Your browser blocked clipboard access.",
        variant: "destructive",
      })
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        "h-7 gap-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
        className
      )}
      onClick={() => void copyGroupId()}
      title={groupId}
      aria-label={`Copy group ID: ${groupId}`}
    >
      GROUP ID
      <Copy className="h-3 w-3 shrink-0 opacity-70" />
    </Button>
  )
}
