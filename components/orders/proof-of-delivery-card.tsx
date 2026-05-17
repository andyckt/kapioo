"use client";

/* eslint-disable @next/next/no-img-element -- POD images come from Route Optimizer R2/CDN hosts. */

import { useState } from "react";
import { ExternalLink, Image as ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { formatDateTime } from "@/lib/format";
import { useLanguage } from "@/lib/language-context";

type ProofOfDelivery = {
  imageUrl?: string;
  imageKey?: string;
  capturedAt?: string | Date;
  receivedAt?: string | Date;
  stopId?: string;
  driverId?: string;
  note?: string;
};

type ProofOfDeliveryCardProps = {
  proofOfDelivery?: ProofOfDelivery | null;
  className?: string;
  showEmptyState?: boolean;
};

export function ProofOfDeliveryCard({
  proofOfDelivery,
  className,
  showEmptyState = true,
}: ProofOfDeliveryCardProps) {
  const { t, language } = useLanguage();
  const [previewOpen, setPreviewOpen] = useState(false);
  const imageUrl = proofOfDelivery?.imageUrl;
  const capturedAt = proofOfDelivery?.capturedAt;
  const locale = language === "en" ? "en-US" : "zh-CN";

  if (!imageUrl && !showEmptyState) {
    return null;
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4" />
            {t("proofOfDeliveryTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {imageUrl ? (
            <>
              <button
                type="button"
                className="group block w-full overflow-hidden rounded-lg border bg-muted/20 text-left outline-none transition hover:border-[#C2884E]/60 focus-visible:ring-2 focus-visible:ring-[#C2884E]/70"
                onClick={() => setPreviewOpen(true)}
              >
                <img
                  src={imageUrl}
                  alt={t("proofOfDeliveryTitle")}
                  className="max-h-72 w-full object-contain transition group-hover:scale-[1.01]"
                />
              </button>

              {capturedAt ? (
                <p className="text-xs text-muted-foreground">
                  {t("proofPhotoCapturedAt")}:{" "}
                  <span className="text-foreground">
                    {formatDateTime(capturedAt, { locale })}
                  </span>
                </p>
              ) : null}

              {proofOfDelivery?.note ? (
                <p className="rounded-md bg-muted/40 px-3 py-2 text-muted-foreground">
                  {proofOfDelivery.note}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewOpen(true)}
                >
                  <ImageIcon className="mr-1.5 h-4 w-4" />
                  {t("viewProofPhoto")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(imageUrl, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  {t("openInNewTab")}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">{t("proofOfDeliveryEmpty")}</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-[calc(100vw-1.25rem)] max-w-3xl overflow-hidden border-[#E8DDD4] p-0 shadow-lg sm:rounded-2xl">
          <VisuallyHidden>
            <DialogTitle>{t("proofOfDeliveryTitle")}</DialogTitle>
          </VisuallyHidden>
          <DialogHeader className="border-b border-[#C2884E]/10 bg-gradient-to-b from-[#FBF7F2] to-[#FFFCF9] px-5 py-4 text-left">
            <DialogTitle className="text-lg font-semibold text-[#6B5F53]">
              {t("proofOfDeliveryTitle")}
            </DialogTitle>
          </DialogHeader>
          {imageUrl ? (
            <div className="space-y-4 bg-white p-4">
              <img
                src={imageUrl}
                alt={t("proofOfDeliveryTitle")}
                className="max-h-[70vh] w-full rounded-lg object-contain"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => window.open(imageUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {t("openInNewTab")}
              </Button>
            </div>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">{t("proofUnavailable")}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
