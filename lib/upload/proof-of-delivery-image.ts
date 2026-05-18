import { uploadMenuImageToS3, validateMenuImageFile } from "@/lib/upload/menu-image";

/** Admin-uploaded POD photos (stored in Kapioo S3, not Route Optimizer R2). */
export async function uploadProofOfDeliveryImageToS3(params: {
  file: File;
  orderId: string;
}) {
  const validation = validateMenuImageFile(params.file);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  return uploadMenuImageToS3({
    file: params.file,
    prefix: "proof-of-delivery",
    identifier: params.orderId,
  });
}
