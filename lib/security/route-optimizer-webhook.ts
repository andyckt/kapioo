import crypto from "node:crypto";

export function isAuthorizedRouteOptimizerBearer(request: Request, token: string) {
  return request.headers.get("authorization") === `Bearer ${token}`;
}

export function computeBodyHash(rawBody: string) {
  return crypto.createHash("sha256").update(rawBody).digest("hex");
}

export function verifyRouteOptimizerSignature(
  rawBody: string,
  signature: string,
  secret: string
) {
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}
