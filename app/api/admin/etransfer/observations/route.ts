import { handleRouteError, successJson } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import AuditLog from "@/models/AuditLog";

const ACTION = "etransfer.reconciliation-decision";

function positiveInteger(value: string | null, fallback: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maximum);
}

export async function GET(request: Request) {
  const { actor, response } = await requireAdminMfa(request);
  if (!actor || response) return response;

  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const days = positiveInteger(url.searchParams.get("days"), 7, 30);
    const limit = positiveInteger(url.searchParams.get("limit"), 250, 500);
    const since = new Date(Date.now() - days * 24 * 60 * 60_000);
    const filter = { action: ACTION, createdAt: { $gte: since } };
    const [totalEvents, records] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .select("targetId metadata createdAt")
        .lean(),
    ]);

    const latestByRequest = new Map<string, Record<string, any>>();
    for (const record of records) {
      const metadata = (record.metadata || {}) as Record<string, any>;
      const requestKey = String(metadata.requestKey || record.targetId || "");
      if (requestKey && !latestByRequest.has(requestKey)) {
        latestByRequest.set(requestKey, { ...metadata, createdAt: record.createdAt });
      }
    }
    const latest = [...latestByRequest.values()];
    const latestDecisionCounts = latest.reduce<Record<string, number>>((counts, event) => {
      const decision = String(event.decision || "unknown");
      counts[decision] = (counts[decision] || 0) + 1;
      return counts;
    }, {});

    const matched = latest.filter((event) => event.decision === "matched");
    const integrityProblems = matched.filter(
      (event) =>
        !event.receiptId ||
        event.linkedEmailVerified !== true ||
        event.authenticationVerified !== true ||
        event.receiptConflict !== false ||
        event.emailMatches !== true ||
        event.amountMatches !== true ||
        event.currencyMatches !== true ||
        event.receivedWithinWindow !== true ||
        event.receiptAlreadyAllocated !== false
    );
    const receiptRequests = new Map<string, Set<string>>();
    for (const event of matched) {
      if (!event.receiptId) continue;
      const requestKeys = receiptRequests.get(String(event.receiptId)) || new Set<string>();
      requestKeys.add(String(event.requestKey));
      receiptRequests.set(String(event.receiptId), requestKeys);
    }
    const reusedReceipts = [...receiptRequests.values()].filter(
      (requestKeys) => requestKeys.size > 1
    ).length;

    return successJson({
      period: { since, days },
      totalEvents,
      returnedEvents: records.length,
      uniqueRequests: latest.length,
      latestDecisionCounts,
      matchedIntegrityProblems: integrityProblems.length,
      reusedReceipts,
      events: records.map((record) => {
        const metadata = (record.metadata || {}) as Record<string, any>;
        return {
          id: String(record._id),
          createdAt: record.createdAt,
          requestId: record.targetId,
          requestKind: metadata.requestKind,
          decision: metadata.decision,
          reasonCode: metadata.reasonCode,
          checkAttempt: metadata.checkAttempt,
          paymentFirst: metadata.paymentFirst,
          relatedRequestId: metadata.relatedRequestId,
          receiptId: metadata.receiptId,
          linkedEmailVerified: metadata.linkedEmailVerified,
          authenticationVerified: metadata.authenticationVerified,
          receiptConflict: metadata.receiptConflict,
          emailMatches: metadata.emailMatches,
          amountMatches: metadata.amountMatches,
          currencyMatches: metadata.currencyMatches,
          receivedWithinWindow: metadata.receivedWithinWindow,
          receiptAlreadyAllocated: metadata.receiptAlreadyAllocated,
        };
      }),
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/etransfer/observations");
  }
}
