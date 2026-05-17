import { rewriteS3UrlToCloudFront } from "@/lib/upload/menu-image";

type OrderWithProofOfDelivery<TProof = unknown> = {
  proofOfDelivery?: TProof;
};

type ProofOfDeliveryLike = {
  imageUrl?: unknown;
};

export function withRewrittenProofOfDeliveryUrl<TOrder extends OrderWithProofOfDelivery>(
  order: TOrder
): TOrder {
  const proofOfDelivery = order.proofOfDelivery as ProofOfDeliveryLike | undefined;
  if (!proofOfDelivery || typeof proofOfDelivery.imageUrl !== "string") {
    return order;
  }

  const imageUrl = rewriteS3UrlToCloudFront(proofOfDelivery.imageUrl) || proofOfDelivery.imageUrl;

  return {
    ...order,
    proofOfDelivery: {
      ...proofOfDelivery,
      imageUrl,
    },
  };
}
