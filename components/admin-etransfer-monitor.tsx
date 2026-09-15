"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { formatDateTime } from "@/lib/format"

type Receipt = {
  id: string
  reference: string
  payerEmail: string
  senderName: string
  amountCents: number
  currency: "CAD"
  receivedAt: string
  status: "unmatched" | "conflict"
  conflictReason?: string | null
}

type MonitorData = {
  counts: { unmatched: number; conflicts: number }
  mailbox: { mailbox: string; lastSuccessfulAt?: string | null; lastError?: string | null } | null
  receipts: Receipt[]
}

export function AdminEtransferMonitor() {
  const { toast } = useToast()
  const [data, setData] = useState<MonitorData | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/etransfer/receipts", { cache: "no-store" })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to load payment monitor")
      setData(result.data)
    } catch (error) {
      toast({
        title: "Could not load e-Transfer monitor",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>e-Transfer payment monitor</CardTitle>
            <CardDescription>
              Completed deposits that have not been safely connected to a voucher request.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !data ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading payments...</div>
        ) : data ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Money received, no request matched</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">{data.counts.unmatched}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Conflicting payment evidence</p>
                <p className="mt-1 text-2xl font-bold text-red-700">{data.counts.conflicts}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Last mailbox scan</p>
                <p className="mt-1 text-sm font-medium">
                  {data.mailbox?.lastSuccessfulAt ? formatDateTime(data.mailbox.lastSuccessfulAt) : "No successful scan yet"}
                </p>
              </div>
            </div>

            {data.mailbox?.lastError ? (
              <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{data.mailbox.lastError}
              </div>
            ) : (
              <div className="flex gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />No mailbox parser error is currently recorded.
              </div>
            )}

            {data.receipts.length ? (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 text-left">
                    <tr><th className="p-3">Received</th><th className="p-3">Sender</th><th className="p-3">Amount</th><th className="p-3">Reference</th><th className="p-3">Status</th></tr>
                  </thead>
                  <tbody>
                    {data.receipts.map((receipt) => (
                      <tr key={receipt.id} className="border-b last:border-0">
                        <td className="whitespace-nowrap p-3">{formatDateTime(receipt.receivedAt)}</td>
                        <td className="p-3"><div className="font-medium">{receipt.senderName}</div><div className="text-xs text-muted-foreground">{receipt.payerEmail}</div></td>
                        <td className="whitespace-nowrap p-3 font-medium">${(receipt.amountCents / 100).toFixed(2)} {receipt.currency}</td>
                        <td className="p-3 font-mono text-xs">{receipt.reference}</td>
                        <td className="p-3"><Badge variant={receipt.status === "conflict" ? "destructive" : "secondary"}>{receipt.status}</Badge>{receipt.conflictReason ? <p className="mt-1 max-w-xs text-xs text-red-700">{receipt.conflictReason}</p> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">There are no unmatched or conflicting completed deposits.</p>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
