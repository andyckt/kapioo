"use client"

import type { Dispatch, SetStateAction, SyntheticEvent } from "react"

import { CheckCircle2, ExternalLink, Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CreditRequest } from "@/lib/types/admin"

import { getCreditRequestAmount, getCreditRequestUserInfo } from "./request-display"

interface CreditRequestDialogsProps {
  viewRequestOpen: boolean
  setViewRequestOpen: (open: boolean) => void
  approveRequestOpen: boolean
  setApproveRequestOpen: (open: boolean) => void
  declineRequestOpen: boolean
  setDeclineRequestOpen: (open: boolean) => void
  selectedRequest: CreditRequest | null
  approvedSixMeals: number
  setApprovedSixMeals: Dispatch<SetStateAction<number>>
  approvedEightMeals: number
  setApprovedEightMeals: Dispatch<SetStateAction<number>>
  approvedTenMeals: number
  setApprovedTenMeals: Dispatch<SetStateAction<number>>
  approvedTwelveMeals: number
  setApprovedTwelveMeals: Dispatch<SetStateAction<number>>
  approvedSixteenMeals: number
  setApprovedSixteenMeals: Dispatch<SetStateAction<number>>
  adminNotes: string
  setAdminNotes: Dispatch<SetStateAction<string>>
  processingRequest: boolean
  onHandleApproveRequest: (request: CreditRequest) => void
  onHandleDeclineRequest: (request: CreditRequest) => void
  onConfirmApproveRequest: () => void | Promise<void>
  onConfirmDeclineRequest: () => void | Promise<void>
}

function getRequestStatusBadge(status: CreditRequest["status"]) {
  if (status === "pending") {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
  }

  if (status === "approved") {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>
  }

  if (status === "declined") {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Declined</span>
  }

  return null
}

function handleProofImageError(event: SyntheticEvent<HTMLImageElement>) {
  const target = event.target as HTMLImageElement
  target.onerror = null
  target.src = "/placeholder.svg"
}

export function CreditRequestDialogs({
  viewRequestOpen,
  setViewRequestOpen,
  approveRequestOpen,
  setApproveRequestOpen,
  declineRequestOpen,
  setDeclineRequestOpen,
  selectedRequest,
  approvedSixMeals,
  setApprovedSixMeals,
  approvedEightMeals,
  setApprovedEightMeals,
  approvedTenMeals,
  setApprovedTenMeals,
  approvedTwelveMeals,
  setApprovedTwelveMeals,
  approvedSixteenMeals,
  setApprovedSixteenMeals,
  adminNotes,
  setAdminNotes,
  processingRequest,
  onHandleApproveRequest,
  onHandleDeclineRequest,
  onConfirmApproveRequest,
  onConfirmDeclineRequest,
}: CreditRequestDialogsProps) {
  const selectedRequestUser = getCreditRequestUserInfo(selectedRequest)
  const selectedRequestAmount = getCreditRequestAmount(selectedRequest)
  const hasApprovedPlanCounts =
    approvedSixMeals > 0 ||
    approvedEightMeals > 0 ||
    approvedTenMeals > 0 ||
    approvedTwelveMeals > 0 ||
    approvedSixteenMeals > 0

  return (
    <>
      <Dialog open={viewRequestOpen} onOpenChange={setViewRequestOpen}>
        <DialogContent className="sm:max-w-[700px] md:max-w-[800px] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 z-10 bg-background pb-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold">Credit Purchase Request</DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  Request ID: <span className="font-medium">{selectedRequest?.requestId}</span>
                </DialogDescription>
              </div>
              {selectedRequest && <div className="flex items-center">{getRequestStatusBadge(selectedRequest.status)}</div>}
            </div>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6 py-2">
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Submitted By</Label>
                    <p className="font-medium text-base">{selectedRequestUser.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedRequestUser.email}</p>
                  </div>
                  <div className="text-right">
                    <Label className="text-xs text-muted-foreground">Date Submitted</Label>
                    <p className="font-medium text-base">
                      {new Date(selectedRequest.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedRequest.createdAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b border-border">
                  <h3 className="font-medium">Plan & Payment Details</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    {selectedRequest.planDescription && (
                      <div className="col-span-1 sm:col-span-2">
                        <Label className="text-xs text-muted-foreground">Selected Plan</Label>
                        <p className="font-medium text-base">{selectedRequest.planDescription}</p>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs text-muted-foreground">Payment Method</Label>
                      <p className="font-medium text-base mt-1">
                        {selectedRequest.paymentMethod === "wechat" ? (
                          <span className="flex items-center">
                            <img src="/wechatsmallicon.png" alt="WeChat" className="h-5 w-5 mr-2" />
                            微信转账
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <span className="h-5 w-5 mr-2 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                              E
                            </span>
                            Interac e-Transfer
                          </span>
                        )}
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">User ID</Label>
                      <p className="font-medium text-sm mt-1 text-muted-foreground truncate">{selectedRequestUser.id}</p>
                    </div>

                    <div className="border-t pt-4 col-span-1 sm:col-span-2 mt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Subtotal</Label>
                          <p className="font-medium text-base">
                            $
                            {Number(
                              selectedRequest.mealSubtotal ??
                                Math.max(
                                  0,
                                  Number(selectedRequest.originalSubtotal ?? selectedRequest.originalPrice ?? 0) -
                                    Number(selectedRequest.deliveryFeeTotal ?? 0)
                                )
                            ).toFixed(2)}
                          </p>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Promo Code</Label>
                          <p className="font-medium text-base">
                            {selectedRequest.promoCode ? (
                              <span className="text-green-700">
                                {selectedRequest.promoCode} (-${(selectedRequest.promoDiscountAmount || 0).toFixed(2)})
                              </span>
                            ) : (
                              "None"
                            )}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Promo Discount</Label>
                          <p className="font-medium text-base text-green-700">
                            -${Number(selectedRequest.promoDiscountAmount || 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Delivery Fee</Label>
                          <p className="font-medium text-base text-blue-700">
                            ${Number(selectedRequest.deliveryFeeTotal || 0).toFixed(2)}
                            {Number(selectedRequest.deliveryFeePerWeek || 0) > 0 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                (${Number(selectedRequest.deliveryFeePerWeek || 0).toFixed(2)} x{" "}
                                {Number(selectedRequest.mealPlanQuantity || 1)}w)
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Tax</Label>
                          <p className="font-medium text-base text-amber-600">
                            $
                            {Math.max(
                              0,
                              Number(
                                selectedRequest.taxAmount ??
                                  (Number(selectedRequest.finalTotal ?? selectedRequest.amount ?? 0) -
                                    Math.max(
                                      0,
                                      Number(selectedRequest.originalSubtotal ?? selectedRequest.originalPrice ?? 0) -
                                        Number(selectedRequest.promoDiscountAmount || 0)
                                    ))
                              )
                            ).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Final Amount</Label>
                          <p className="font-medium text-base">
                            <span className="text-lg">
                              ${Number(selectedRequest.finalTotal ?? selectedRequest.amount ?? 0).toFixed(2)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {(selectedRequest.status === "approved" || selectedRequest.status === "declined") && (
                <div
                  className={`bg-white border rounded-lg overflow-hidden ${
                    selectedRequest.status === "approved" ? "border-green-200" : "border-red-200"
                  }`}
                >
                  <div
                    className={`px-4 py-2 border-b ${
                      selectedRequest.status === "approved"
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <h3 className="font-medium">
                      {selectedRequest.status === "approved" ? "Approval Details" : "Decline Details"}
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                      {selectedRequest.status === "approved" && (
                        <>
                          <div>
                            <Label className="text-xs text-muted-foreground">Approved Plan</Label>
                            <p className="font-medium text-base">{selectedRequest.planDescription || "Meal Plan"}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Approved Date</Label>
                            <p className="font-medium text-base">
                              {selectedRequest.approvedAt
                                ? new Date(selectedRequest.approvedAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "N/A"}
                            </p>
                          </div>
                        </>
                      )}

                      {selectedRequest.status === "declined" && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Declined Date</Label>
                          <p className="font-medium text-base">
                            {selectedRequest.declinedAt
                              ? new Date(selectedRequest.declinedAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "N/A"}
                          </p>
                        </div>
                      )}

                      {selectedRequest.adminNotes && (
                        <div className={selectedRequest.status === "declined" ? "col-span-1 sm:col-span-2" : ""}>
                          <Label className="text-xs text-muted-foreground">Admin Notes</Label>
                          <p className="font-medium p-3 bg-muted/50 rounded-md text-sm mt-1 max-h-24 overflow-y-auto">
                            {selectedRequest.adminNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1">
                  {selectedRequest.notes ? (
                    <div className="bg-white border border-border rounded-lg overflow-hidden h-full">
                      <div className="bg-muted/50 px-4 py-2 border-b border-border">
                        <h3 className="font-medium">User Notes</h3>
                      </div>
                      <div className="p-4">
                        <p className="text-sm">{selectedRequest.notes}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-border rounded-lg overflow-hidden h-full flex items-center justify-center p-6">
                      <p className="text-sm text-muted-foreground">No notes provided</p>
                    </div>
                  )}
                </div>

                <div className="col-span-1">
                  <div className="bg-white border border-border rounded-lg overflow-hidden h-full">
                    <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center justify-between">
                      <h3 className="font-medium">Payment Proof</h3>
                      <Button variant="ghost" size="sm" asChild className="gap-1 h-8">
                        <a href={selectedRequest.imageProof} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="text-xs">View Full Size</span>
                        </a>
                      </Button>
                    </div>
                    <div className="p-4 flex items-center justify-center">
                      <img
                        src={selectedRequest.imageProof}
                        alt="Payment proof"
                        className="object-contain max-h-[250px] max-w-full rounded-md border border-border/50"
                        onError={handleProofImageError}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sticky bottom-0 pt-4 pb-1 bg-background z-10 border-t mt-6">
            <div className="flex justify-between w-full items-center">
              <Button variant="outline" onClick={() => setViewRequestOpen(false)}>
                Close
              </Button>

              {selectedRequest && selectedRequest.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setViewRequestOpen(false)
                      onHandleDeclineRequest(selectedRequest)
                    }}
                    className="px-5"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                  <Button
                    onClick={() => {
                      setViewRequestOpen(false)
                      onHandleApproveRequest(selectedRequest)
                    }}
                    className="bg-green-600 hover:bg-green-700 px-5"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </div>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approveRequestOpen} onOpenChange={setApproveRequestOpen}>
        <DialogContent className="sm:max-w-[550px] md:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 z-10 bg-background pb-3 pt-1">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">Approve Credit Purchase</DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  Review and approve the credit purchase request.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6 py-2">
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Request ID</Label>
                    <p className="font-medium">{selectedRequest.requestId}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">User</Label>
                    <p className="font-medium">{selectedRequestUser.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedRequestUser.email}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b border-border">
                  <h3 className="font-medium">Plan & Payment Details</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    {selectedRequest.planDescription && (
                      <div className="col-span-1 sm:col-span-2">
                        <Label className="text-xs text-muted-foreground">Selected Plan</Label>
                        <p className="font-medium">{selectedRequest.planDescription}</p>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs text-muted-foreground">Payment Method</Label>
                      <p className="font-medium flex items-center mt-1">
                        {selectedRequest.paymentMethod === "wechat" ? (
                          <>
                            <img src="/wechatsmallicon.png" alt="WeChat" className="h-5 w-5 mr-2" />
                            微信转账
                          </>
                        ) : (
                          <>
                            <span className="h-5 w-5 mr-2 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                              E
                            </span>
                            Interac e-Transfer
                          </>
                        )}
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Amount Paid</Label>
                      <p className="font-medium">
                        ${selectedRequestAmount.toFixed(2)}
                        {selectedRequest.paymentMethod === "wechat" && (
                          <span className="ml-2 text-xs text-green-600">(10% discount applied)</span>
                        )}
                        {selectedRequest.paymentMethod === "emt" && (
                          <span className="ml-2 text-xs text-amber-600">(13% tax included)</span>
                        )}
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">INTERAC Email</Label>
                      <p className="font-medium">{selectedRequest.referenceNumber || "No INTERAC email provided"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-border rounded-lg overflow-hidden">
                <div className="bg-green-50 px-4 py-2 border-b border-green-200">
                  <h3 className="font-medium text-green-800">Meal Plans to Add</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="approved-six-meals" className="text-sm font-medium">
                        6 Meals/Week
                      </Label>
                      <Input
                        id="approved-six-meals"
                        type="number"
                        value={approvedSixMeals}
                        onChange={(e) => setApprovedSixMeals(parseInt(e.target.value, 10) || 0)}
                        className="mt-1"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="approved-eight-meals" className="text-sm font-medium">
                        8 Meals/Week
                      </Label>
                      <Input
                        id="approved-eight-meals"
                        type="number"
                        value={approvedEightMeals}
                        onChange={(e) => setApprovedEightMeals(parseInt(e.target.value, 10) || 0)}
                        className="mt-1"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="approved-ten-meals" className="text-sm font-medium">
                        10 Meals/Week
                      </Label>
                      <Input
                        id="approved-ten-meals"
                        type="number"
                        value={approvedTenMeals}
                        onChange={(e) => setApprovedTenMeals(parseInt(e.target.value, 10) || 0)}
                        className="mt-1"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="approved-twelve-meals" className="text-sm font-medium">
                        12 Meals/Week
                      </Label>
                      <Input
                        id="approved-twelve-meals"
                        type="number"
                        value={approvedTwelveMeals}
                        onChange={(e) => setApprovedTwelveMeals(parseInt(e.target.value, 10) || 0)}
                        className="mt-1"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="approved-sixteen-meals" className="text-sm font-medium">
                        16 Meals/Week
                      </Label>
                      <Input
                        id="approved-sixteen-meals"
                        type="number"
                        value={approvedSixteenMeals}
                        onChange={(e) => setApprovedSixteenMeals(parseInt(e.target.value, 10) || 0)}
                        className="mt-1"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="admin-notes" className="text-sm font-medium">
                    Admin Notes
                  </Label>
                  <textarea
                    id="admin-notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm mt-1"
                    placeholder="Optional admin notes"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Payment Proof</Label>
                  <div className="mt-1 border rounded-md overflow-hidden">
                    <div className="p-3 flex items-center justify-center bg-muted/30">
                      <img
                        src={selectedRequest.imageProof}
                        alt="Payment proof"
                        className="object-contain max-h-[120px]"
                        onError={handleProofImageError}
                      />
                    </div>
                    <div className="p-2 bg-muted/50 flex justify-end">
                      <Button variant="ghost" size="sm" asChild className="gap-1 h-7">
                        <a href={selectedRequest.imageProof} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                          <span className="text-xs">View Full Size</span>
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sticky bottom-0 pt-4 pb-1 bg-background z-10 border-t mt-6">
            <div className="flex justify-between w-full items-center">
              <Button variant="outline" onClick={() => setApproveRequestOpen(false)} disabled={processingRequest}>
                Cancel
              </Button>
              <Button
                onClick={() => void onConfirmApproveRequest()}
                disabled={processingRequest || !hasApprovedPlanCounts}
                className="bg-green-600 hover:bg-green-700 px-6 gap-2"
              >
                {processingRequest ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm Approval
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={declineRequestOpen} onOpenChange={setDeclineRequestOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-500">Decline Credit Purchase</DialogTitle>
            <DialogDescription>Are you sure you want to decline this credit purchase request?</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="decline-request-id" className="text-right">
                  Request ID
                </Label>
                <Input id="decline-request-id" value={selectedRequest.requestId} className="col-span-3" disabled />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="decline-user" className="text-right">
                  User
                </Label>
                <Input id="decline-user" value={selectedRequestUser.name} className="col-span-3" disabled />
              </div>

              {selectedRequest.planDescription && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="decline-plan" className="text-right">
                    Selected Plan
                  </Label>
                  <Input id="decline-plan" value={selectedRequest.planDescription} className="col-span-3" disabled />
                </div>
              )}

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="decline-notes" className="text-right pt-2">
                  Reason
                </Label>
                <textarea
                  id="decline-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="col-span-3 min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  placeholder="Reason for declining (optional)"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineRequestOpen(false)} disabled={processingRequest}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void onConfirmDeclineRequest()}
              disabled={processingRequest}
              className="gap-1"
            >
              {processingRequest && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
