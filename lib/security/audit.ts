import type { NextRequest } from "next/server";
import type mongoose from "mongoose";

import connectToDatabase from "@/lib/db";
import AuditLog from "@/models/AuditLog";

type AuditInput = {
  actor?: {
    user?: { _id?: unknown; email?: string };
    role?: "user" | "admin";
  } | null;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  request?: Request | NextRequest;
  session?: mongoose.ClientSession;
};

export async function logAuditEvent(input: AuditInput) {
  try {
    await connectToDatabase();

    const auditLog = new AuditLog({
      actorUserId: input.actor?.user?._id,
      actorRole: input.actor?.role || "system",
      actorEmail: input.actor?.user?.email,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata || {},
      ipAddress:
        input.request?.headers.get("x-forwarded-for") ||
        input.request?.headers.get("x-real-ip") ||
        undefined,
      userAgent: input.request?.headers.get("user-agent") || undefined,
    });
    await auditLog.save(input.session ? { session: input.session } : undefined);
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

