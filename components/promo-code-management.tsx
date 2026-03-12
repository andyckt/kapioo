'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, RefreshCcw } from 'lucide-react'

interface PromoCodeRow {
  _id: string
  code: string
  description?: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  active: boolean
  appliesTo: 'daily_topup' | 'weekly_topup' | 'all'
  promoOnlyEmt: boolean
  usageCount: number
  usageCountFromRedemptions?: number
  maxUses?: number
  expiresAt?: string
}

interface PromoAppliedRequest {
  _id: string
  requestId: string
  purchaseType: 'daily_topup' | 'weekly_topup'
  consumedAt: string
  discountAmount: number
  originalSubtotal: number
  finalTotal: number
  request?: any
}

export function PromoCodeManagement() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [promoCodes, setPromoCodes] = useState<PromoCodeRow[]>([])

  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState<number>(10)
  const [maxUses, setMaxUses] = useState<string>('')
  const [expiresAt, setExpiresAt] = useState('')
  const [appliesTo, setAppliesTo] = useState<'daily_topup' | 'weekly_topup' | 'all'>('all')
  const [promoOnlyEmt, setPromoOnlyEmt] = useState(true)
  const [oneUsePerUser, setOneUsePerUser] = useState(true)
  const [expandedPromoId, setExpandedPromoId] = useState<string | null>(null)
  const [isLoadingAppliedRequests, setIsLoadingAppliedRequests] = useState(false)
  const [appliedRequestsByPromo, setAppliedRequestsByPromo] = useState<Record<string, PromoAppliedRequest[]>>({})

  const fetchPromoCodes = async (options?: { signal?: AbortSignal }) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/promo-codes', { signal: options?.signal })
      if (options?.signal?.aborted) return
      const result = await response.json()
      if (options?.signal?.aborted) return
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch promo codes')
      }
      setPromoCodes(result.data || [])
    } catch (error: any) {
      if (options?.signal?.aborted || (error?.name === 'AbortError')) return
      toast({
        title: 'Error',
        description: error?.message || 'Failed to fetch promo codes',
        variant: 'destructive'
      })
    } finally {
      if (!options?.signal?.aborted) setIsLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    void fetchPromoCodes({ signal: controller.signal })
    return () => controller.abort()
  }, [])

  const handleCreate = async () => {
    if (!code.trim()) {
      toast({ title: 'Code required', description: 'Please enter a promo code.', variant: 'destructive' })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          description,
          discountType,
          discountValue,
          maxUses: maxUses ? Number(maxUses) : undefined,
          expiresAt: expiresAt || undefined,
          appliesTo,
          promoOnlyEmt,
          oneUsePerUser,
          active: true
        })
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create promo code')
      }

      toast({ title: 'Promo code created', description: `${result.data.code} is now available.` })
      setCode('')
      setDescription('')
      setMaxUses('')
      setExpiresAt('')
      setDiscountValue(10)
      await fetchPromoCodes()
    } catch (error: any) {
      toast({
        title: 'Create failed',
        description: error?.message || 'Failed to create promo code',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (promo: PromoCodeRow) => {
    try {
      const response = await fetch(`/api/admin/promo-codes/${promo._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !promo.active })
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update promo code')
      }
      await fetchPromoCodes()
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error?.message || 'Failed to update promo code',
        variant: 'destructive'
      })
    }
  }

  const fetchAppliedRequests = async (promoId: string) => {
    setIsLoadingAppliedRequests(true)
    try {
      const response = await fetch(`/api/admin/promo-codes/${promoId}/redemptions`)
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch applied requests')
      }
      setAppliedRequestsByPromo((prev) => ({
        ...prev,
        [promoId]: result.data.items || []
      }))
    } catch (error: any) {
      toast({
        title: 'Load failed',
        description: error?.message || 'Failed to load applied requests',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingAppliedRequests(false)
    }
  }

  const toggleAppliedRequests = async (promoId: string) => {
    if (expandedPromoId === promoId) {
      setExpandedPromoId(null)
      return
    }
    setExpandedPromoId(promoId)
    if (!appliedRequestsByPromo[promoId]) {
      await fetchAppliedRequests(promoId)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Promo Code</CardTitle>
          <CardDescription>Supports one code per order, usage limits, expiry, and EMT-only controls.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="promo-code">Code</Label>
              <Input id="promo-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-desc">Description</Label>
              <Input id="promo-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select value={discountType} onValueChange={(value: 'percentage' | 'fixed') => setDiscountType(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed CAD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-value">{discountType === 'percentage' ? 'Discount (%)' : 'Discount Amount (CAD)'}</Label>
              <Input id="discount-value" type="number" min="0" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value || 0))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-uses">Max Uses (optional)</Label>
              <Input id="max-uses" type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires-at">Expiry (optional)</Label>
              <Input id="expires-at" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Applies To</Label>
              <Select value={appliesTo} onValueChange={(value: 'daily_topup' | 'weekly_topup' | 'all') => setAppliesTo(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Checkout Types</SelectItem>
                  <SelectItem value="daily_topup">Daily Top-up</SelectItem>
                  <SelectItem value="weekly_topup">Weekly Top-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="promo-emt-only">EMT only</Label>
                <Switch id="promo-emt-only" checked={promoOnlyEmt} onCheckedChange={setPromoOnlyEmt} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="promo-one-use">One use per phone</Label>
                <Switch id="promo-one-use" checked={oneUsePerUser} onCheckedChange={setOneUsePerUser} />
              </div>
            </div>
          </div>

          <Button onClick={handleCreate} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Promo Code
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Existing Promo Codes</CardTitle>
            <CardDescription>Toggle active state instantly for checkout availability.</CardDescription>
          </div>
          <Button variant="outline" onClick={fetchPromoCodes} disabled={isLoading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {promoCodes.map((promo) => (
              <div key={promo._id} className="rounded-md border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{promo.code}</span>
                    <Badge variant={promo.active ? 'default' : 'secondary'}>
                      {promo.active ? 'Active' : 'Inactive'}
                    </Badge>
                    {promo.promoOnlyEmt ? <Badge variant="outline">EMT only</Badge> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${promo._id}`} className="text-sm">Active</Label>
                    <Switch
                      id={`active-${promo._id}`}
                      checked={promo.active}
                      onCheckedChange={() => handleToggleActive(promo)}
                    />
                  </div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {promo.description || 'No description'}
                </div>
                <div className="mt-2 text-sm">
                  {promo.discountType === 'percentage'
                    ? `${promo.discountValue}% off`
                    : `CAD $${promo.discountValue.toFixed(2)} off`}
                  {' · '}
                  Applies to: {promo.appliesTo}
                  {' · '}
                  Used: {promo.usageCountFromRedemptions ?? promo.usageCount}
                  {promo.maxUses ? ` / ${promo.maxUses}` : ''}
                </div>
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={() => toggleAppliedRequests(promo._id)}>
                    {expandedPromoId === promo._id ? 'Hide Applied Requests' : 'View Applied Requests'}
                  </Button>
                </div>

                {expandedPromoId === promo._id ? (
                  <div className="mt-3 rounded-md border p-3">
                    {isLoadingAppliedRequests && !appliedRequestsByPromo[promo._id] ? (
                      <div className="text-sm text-muted-foreground">Loading applied requests...</div>
                    ) : (
                      <div className="space-y-2">
                        {(appliedRequestsByPromo[promo._id] || []).length === 0 ? (
                          <div className="text-sm text-muted-foreground">No requests have applied this code yet.</div>
                        ) : (
                          (appliedRequestsByPromo[promo._id] || []).map((item) => (
                            <div key={item._id} className="rounded border p-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-sm font-medium">
                                  {item.requestId} ({item.purchaseType === 'weekly_topup' ? 'Weekly' : 'Daily'})
                                </div>
                                <Badge variant="outline">{item.request?.status || 'unknown'}</Badge>
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                User: {item.request?.userId?.name || 'Unknown'} {item.request?.userId?.email ? `(${item.request.userId.email})` : ''}
                              </div>
                              <div className="mt-1 text-xs">
                                Subtotal: ${Number(item.originalSubtotal).toFixed(2)} · Discount: -${Number(item.discountAmount).toFixed(2)} · Final: ${Number(item.finalTotal).toFixed(2)}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                Applied at: {new Date(item.consumedAt).toLocaleString()}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
            {!isLoading && promoCodes.length === 0 ? (
              <div className="text-sm text-muted-foreground">No promo codes yet.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
