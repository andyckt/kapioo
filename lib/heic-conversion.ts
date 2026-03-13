"use client";

export async function convertHeicToJpeg(file: File, quality = 0.8): Promise<File> {
  const { default: heic2any } = await import("heic2any");
  const jpegBlob = (await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality,
  })) as Blob;

  return new File([jpegBlob], file.name.replace(/\.heic|\.heif/i, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
