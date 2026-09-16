"use client"

import { useEffect, type MutableRefObject } from "react"

type PaymentIntentOptions = {
  enabled: boolean
  requestKind: "daily" | "weekly"
  planId?: string
  payerEmail: string
  amountCents: number
  submissionKeyRef: MutableRefObject<string | null>
}

export function useEtransferPaymentIntent(options: PaymentIntentOptions) {
  const {
    enabled,
    requestKind,
    planId,
    payerEmail,
    amountCents,
    submissionKeyRef,
  } = options

  useEffect(() => {
    if (!enabled || !planId || !payerEmail || amountCents <= 0) return

    const submissionKey =
      submissionKeyRef.current || (submissionKeyRef.current = crypto.randomUUID())
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        await fetch("/api/etransfer/payment-intents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submissionKey,
            requestKind,
            planId,
            payerEmail,
            amountCents,
          }),
          signal: controller.signal,
        })
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn("Unable to record e-Transfer checkout intent", error)
        }
      }
    }, 400)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [enabled, requestKind, planId, payerEmail, amountCents, submissionKeyRef])
}
