import { NextResponse } from "next/server";

import {
  errorJson,
  handleRouteError,
  parseJsonBody,
  parseSearchParams,
  successJson,
} from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import {
  adminCreditPurchaseActionBodySchema,
  adminCreditPurchaseRequestsQuerySchema,
} from "@/lib/contracts/credit-request";
import {
  applyBalanceMutations,
  BalanceMutationError,
  type BalanceMutationEntry,
} from "@/lib/balances/mutations";
import connectToDatabase from "@/lib/db";
import CreditPurchaseRequest from "@/models/CreditPurchaseRequest";
import User from "@/models/User";
import mongoose from "mongoose";
import { sendCreditPurchaseStatusEmail } from "@/lib/services/email";
import { toWeeklyPlanId } from "@/lib/plans/service";

// GET handler - get all credit purchase requests with filtering and pagination
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data: query, error: queryError } = parseSearchParams(
      request,
      adminCreditPurchaseRequestsQuerySchema
    );
    if (queryError) {
      return queryError;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { status } = query;
    const skip = (page - 1) * limit;

    await connectToDatabase();

    const mongoQuery: Record<string, unknown> = {};

    if (status) {
      mongoQuery.status = status;
    }

    const requests = await CreditPurchaseRequest.find(mongoQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email userID address.province");

    const totalRequests = await CreditPurchaseRequest.countDocuments(mongoQuery);

    return successJson({
      requests,
      page,
      limit,
      total: totalRequests,
      pages: Math.ceil(totalRequests / limit),
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/credits/request/admin");
  }
}

// POST handler - approve or decline a credit purchase request
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data, error: bodyError } = await parseJsonBody(
      request,
      adminCreditPurchaseActionBodySchema
    );
    if (bodyError) {
      return bodyError;
    }

    await connectToDatabase();

    const creditRequest = await CreditPurchaseRequest.findOne({ requestId: data.requestId });
    if (!creditRequest) {
      return errorJson("Credit purchase request not found", 404);
    }

    if (creditRequest.status !== "pending") {
      return errorJson(`Request is already ${creditRequest.status}`, 400);
    }

    const user = await User.findById(creditRequest.userId);
    if (!user) {
      return errorJson("User not found", 404);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (data.action === "approve") {
        const approvedSixMeals = data.approvedSixMeals || 0;
        const approvedEightMeals = data.approvedEightMeals || 0;
        const approvedTenMeals = data.approvedTenMeals || 0;
        const approvedTwelveMeals = data.approvedTwelveMeals || 0;
        const approvedSixteenMeals = data.approvedSixteenMeals || 0;
        const approvedCredits = data.approvedCredits || 0;

        if (
          approvedSixMeals <= 0 &&
          approvedEightMeals <= 0 &&
          approvedTenMeals <= 0 &&
          approvedTwelveMeals <= 0 &&
          approvedSixteenMeals <= 0 &&
          approvedCredits <= 0
        ) {
          return errorJson("At least one meal plan type must have a value", 400);
        }

        const approvedPlans = [
          { planId: toWeeklyPlanId(6, 1), quantity: approvedSixMeals },
          { planId: toWeeklyPlanId(8, 1), quantity: approvedEightMeals },
          { planId: toWeeklyPlanId(10, 1), quantity: approvedTenMeals },
          { planId: toWeeklyPlanId(12, 1), quantity: approvedTwelveMeals },
          { planId: toWeeklyPlanId(16, 1), quantity: approvedSixteenMeals },
        ].filter((entry) => entry.quantity > 0);

        creditRequest.status = "approved";
        creditRequest.approvedSixMeals = approvedSixMeals;
        creditRequest.approvedEightMeals = approvedEightMeals;
        creditRequest.approvedTenMeals = approvedTenMeals;
        creditRequest.approvedTwelveMeals = approvedTwelveMeals;
        creditRequest.approvedSixteenMeals = approvedSixteenMeals;
        creditRequest.approvedPlans = approvedPlans;
        creditRequest.approvedCredits = approvedCredits;
        creditRequest.adminNotes = data.adminNotes || "";
        creditRequest.approvedAt = new Date();
        await creditRequest.save({ session });

        const balanceMutations: BalanceMutationEntry[] = [];
        if (approvedSixMeals > 0)
          balanceMutations.push({
            field: "weeklySIXmeals",
            amount: approvedSixMeals,
            operation: "add",
          });
        if (approvedEightMeals > 0)
          balanceMutations.push({
            field: "weeklyEIGHTmeals",
            amount: approvedEightMeals,
            operation: "add",
          });
        if (approvedTenMeals > 0)
          balanceMutations.push({
            field: "weeklyTENmeals",
            amount: approvedTenMeals,
            operation: "add",
          });
        if (approvedTwelveMeals > 0)
          balanceMutations.push({
            field: "weeklyTWELVEmeals",
            amount: approvedTwelveMeals,
            operation: "add",
          });
        if (approvedSixteenMeals > 0)
          balanceMutations.push({
            field: "weeklySIXTEENmeals",
            amount: approvedSixteenMeals,
            operation: "add",
          });
        if (approvedCredits > 0)
          balanceMutations.push({
            field: "credits",
            amount: approvedCredits,
            operation: "add",
          });

        await applyBalanceMutations({
          user,
          mutations: balanceMutations,
          description: `Meal plan purchase approved (Request ID: ${creditRequest.requestId})`,
          session,
        });

        await session.commitTransaction();

        try {
          await sendCreditPurchaseStatusEmail(
            user.email,
            user.name || user.userID,
            creditRequest.requestId,
            "approved",
            approvedCredits,
            creditRequest.planDescription,
            user.languagePreference || "zh"
          );
        } catch (emailError) {
          console.error("Error sending approval email:", emailError);
        }

        return successJson({
          request: creditRequest,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            credits: user.credits,
            weeklySIXmeals: user.weeklySIXmeals,
            weeklyEIGHTmeals: user.weeklyEIGHTmeals,
            weeklyTENmeals: user.weeklyTENmeals,
            weeklyTWELVEmeals: user.weeklyTWELVEmeals,
            weeklySIXTEENmeals: user.weeklySIXTEENmeals,
            planBalances: user.planBalances || {},
          },
        });
      }

      creditRequest.status = "declined";
      creditRequest.adminNotes = data.adminNotes || "";
      creditRequest.declinedAt = new Date();
      await creditRequest.save({ session });

      await session.commitTransaction();

      try {
        await sendCreditPurchaseStatusEmail(
          user.email,
          user.name || user.userID,
          creditRequest.requestId,
          "declined",
          undefined,
          creditRequest.planDescription,
          user.languagePreference || "zh"
        );
      } catch (emailError) {
        console.error("Error sending decline email:", emailError);
      }

      return successJson({
        request: creditRequest,
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    if (error instanceof BalanceMutationError) {
      return NextResponse.json(
        { success: false, error: error.message, details: error.details },
        { status: error.status }
      );
    }

    return handleRouteError(error, "POST /api/credits/request/admin");
  }
}
