import { NextResponse } from "next/server";

import { errorJson, handleRouteError, parseJsonBody, successJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import {
  interacPayerEmailBodySchema,
  verifyInteracPayerEmailBodySchema,
} from "@/lib/contracts/etransfer-payer-email";
import connectToDatabase from "@/lib/db";
import {
  beginInteracPayerEmailVerification,
  InteracPayerEmailError,
  listInteracPayerEmails,
  toSafeInteracPayerEmail,
  unlinkInteracPayerEmail,
  verifyInteracPayerEmail,
} from "@/lib/etransfer/payer-email";
import { logAuditEvent } from "@/lib/security/audit";
import { sendInteracPayerEmailVerification } from "@/lib/services/email";

function payerEmailError(error: unknown) {
  if (!(error instanceof InteracPayerEmailError)) return null;
  return NextResponse.json(
    { success: false, error: error.message, errorCode: error.code },
    { status: error.status }
  );
}

export async function GET() {
  const { actor, response } = await requireUser();
  if (!actor || response) return response;
  try {
    await connectToDatabase();
    return successJson({
      emails: await listInteracPayerEmails(String(actor.user._id)),
      limit: 3,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/etransfer/payer-emails");
  }
}

export async function POST(request: Request) {
  const { actor, response } = await requireUser();
  if (!actor || response) return response;
  try {
    const { data, error } = await parseJsonBody(request, interacPayerEmailBodySchema);
    if (error) return error;
    await connectToDatabase();
    const result = await beginInteracPayerEmailVerification({
      userId: String(actor.user._id),
      email: data.email,
      sendCode: (code) =>
        sendInteracPayerEmailVerification(
          data.email,
          code,
          actor.user.name || actor.user.userID,
          actor.user.languagePreference || "zh"
        ),
    });
    await logAuditEvent({
      actor,
      action: result.alreadyVerified
        ? "interac-payer-email.already-verified"
        : "interac-payer-email.code-sent",
      targetType: "interac-payer-email",
      targetId: String(result.record._id),
      request,
    });
    return successJson({
      email: toSafeInteracPayerEmail(result.record.toObject()),
      sent: result.sent,
    });
  } catch (error) {
    return payerEmailError(error) || handleRouteError(error, "POST /api/etransfer/payer-emails");
  }
}

export async function PUT(request: Request) {
  const { actor, response } = await requireUser();
  if (!actor || response) return response;
  try {
    const { data, error } = await parseJsonBody(request, verifyInteracPayerEmailBodySchema);
    if (error) return error;
    await connectToDatabase();
    const record = await verifyInteracPayerEmail({
      userId: String(actor.user._id),
      email: data.email,
      code: data.code,
    });
    await logAuditEvent({
      actor,
      action: "interac-payer-email.verified",
      targetType: "interac-payer-email",
      targetId: String(record._id),
      request,
    });
    return successJson({ email: toSafeInteracPayerEmail(record.toObject()) });
  } catch (error) {
    return payerEmailError(error) || handleRouteError(error, "PUT /api/etransfer/payer-emails");
  }
}

export async function DELETE(request: Request) {
  const { actor, response } = await requireUser();
  if (!actor || response) return response;
  try {
    const { data, error } = await parseJsonBody(request, interacPayerEmailBodySchema);
    if (error) return error;
    await connectToDatabase();
    const record = await unlinkInteracPayerEmail({ userId: String(actor.user._id), email: data.email });
    await logAuditEvent({
      actor,
      action: "interac-payer-email.unlinked",
      targetType: "interac-payer-email",
      targetId: String(record._id),
      request,
      metadata: { email: record.emailNormalized },
    });
    return successJson({ message: "Interac sender email unlinked" });
  } catch (error) {
    return payerEmailError(error) || handleRouteError(error, "DELETE /api/etransfer/payer-emails");
  }
}
