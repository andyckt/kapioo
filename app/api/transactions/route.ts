import { errorJson, parseSearchParams, successJson } from "@/lib/api";
import { requireAdminMfa, requireUser } from "@/lib/auth/guards";
import connectToDatabase from "@/lib/db";
import { transactionsQuerySchema } from "@/lib/contracts/common";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import CreditPurchaseRequest from "@/models/CreditPurchaseRequest";
import VoucherPurchaseRequest from "@/models/VoucherPurchaseRequest";
import { getUserDisplayName } from "@/lib/users/display";
import mongoose from "mongoose";

function extractSourceRequestId(description?: unknown): string | undefined {
  if (typeof description !== "string") {
    return undefined;
  }

  const match = description.match(/Request ID:\s*([^)]+)/i);
  return match?.[1]?.trim();
}

function buildSourceRequestSummary(request: Record<string, unknown> | undefined) {
  if (!request) {
    return undefined;
  }

  const type = typeof request.type === "string" ? request.type : undefined;
  const quantity = typeof request.quantity === "number" ? request.quantity : undefined;
  const planDescription =
    typeof request.planDescription === "string"
      ? request.planDescription
      : type === "twoDish"
        ? `${quantity || 0} x 2-dish vouchers`
        : type === "threeDish"
          ? `${quantity || 0} x 3-dish vouchers`
          : undefined;

  return {
    requestId: typeof request.requestId === "string" ? request.requestId : undefined,
    planDescription,
    status: typeof request.status === "string" ? request.status : undefined,
    amount: typeof request.amount === "number" ? request.amount : undefined,
    finalTotal: typeof request.finalTotal === "number" ? request.finalTotal : undefined,
    paymentMethod: typeof request.paymentMethod === "string" ? request.paymentMethod : undefined,
    referenceNumber:
      typeof request.referenceNumber === "string" ? request.referenceNumber : undefined,
  };
}

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    const queryParsed = parseSearchParams(request.url, transactionsQuerySchema);
    if (queryParsed.error) {
      return queryParsed.error;
    }
    const { userId } = queryParsed.data;
    const page = queryParsed.data.page ?? 1;
    const limit = queryParsed.data.limit ?? 10;
    const skip = (page - 1) * limit;

    console.log("Connecting to database...");
    await connectToDatabase();
    console.log("Database connected");

    const query: Record<string, unknown> = {};
    if (userId) {
      const isSelf =
        String(actor.user._id) === String(userId) ||
        String(actor.user.userID) === String(userId);
      if (!isSelf && actor.role !== "admin") {
        return errorJson("You do not have access to these transactions", 403);
      }

      if (!isSelf && actor.role === "admin") {
        const { response: adminMfaResponse } = await requireAdminMfa(request);
        if (adminMfaResponse) {
          return adminMfaResponse;
        }
      }

      if (mongoose.Types.ObjectId.isValid(userId)) {
        query["$or"] = [
          { userId: new mongoose.Types.ObjectId(userId) },
          { userId },
        ];
      } else {
        query.userId = userId;
      }
      console.log("Using userId query:", JSON.stringify(query));
    } else if (actor.role !== "admin") {
      query["$or"] = [
        { userId: actor.user._id },
        { userId: String(actor.user._id) },
      ];
    } else {
      const { response: adminMfaResponse } = await requireAdminMfa(request);
      if (adminMfaResponse) {
        return adminMfaResponse;
      }
    }

    console.log("Executing transaction query:", JSON.stringify(query));
    console.log("Transaction model defined?", !!Transaction);

    try {
      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      console.log(`Found ${transactions.length} transactions`);

      const totalTransactions = await Transaction.countDocuments(query);

      const userIds = Array.from(
        new Set(
          transactions
            .map((transaction) => String(transaction.userId || ""))
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
        )
      );
      const users = userIds.length > 0
        ? await User.find({ _id: { $in: userIds } })
            .select("_id name nickname email userID")
            .lean()
        : [];
      const userById = new Map(users.map((user) => [String(user._id), user]));
      const sourceRequestIds = Array.from(
        new Set(
          transactions
            .map((transaction) => extractSourceRequestId(transaction.description))
            .filter((requestId): requestId is string => Boolean(requestId))
        )
      );
      const [creditRequests, voucherRequests] = sourceRequestIds.length > 0
        ? await Promise.all([
            CreditPurchaseRequest.find({ requestId: { $in: sourceRequestIds } })
              .select("requestId planDescription status amount finalTotal paymentMethod referenceNumber")
              .lean(),
            VoucherPurchaseRequest.find({ requestId: { $in: sourceRequestIds } })
              .select("requestId type quantity status amount finalTotal referenceNumber")
              .lean(),
          ])
        : [[], []];
      const sourceRequestById = new Map(
        [...creditRequests, ...voucherRequests].map((request) => [
          String(request.requestId),
          buildSourceRequestSummary(request),
        ])
      );
      const transactionsWithUsers = transactions.map((transaction) => {
        const user = userById.get(String(transaction.userId));
        const sourceRequestId = extractSourceRequestId(transaction.description);
        const sourceRequest = sourceRequestId
          ? sourceRequestById.get(sourceRequestId)
          : undefined;
        return {
          ...transaction,
          userName: user ? getUserDisplayName(user) : undefined,
          userEmail: typeof user?.email === "string" ? user.email : undefined,
          userID: typeof user?.userID === "string" ? user.userID : undefined,
          sourceRequestId,
          sourceRequest,
        };
      });

      return successJson({
        transactions: transactionsWithUsers,
        page,
        limit,
        total: totalTransactions,
        pages: Math.ceil(totalTransactions / limit),
      });
    } catch (dbError: unknown) {
      console.error("Database error when fetching transactions:", dbError);
      const message =
        dbError instanceof Error ? dbError.message : "Unknown database error";
      return errorJson("Database error when fetching transactions", 500, {
        details: message,
      });
    }
  } catch (error: unknown) {
    console.error("Error fetching transactions:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch transactions";
    return errorJson("Failed to fetch transactions", 500, { details: message });
  }
}
