import { NextRequest, NextResponse } from "next/server";

import { parseJsonBody } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import dbConnect from "@/lib/db";
import { maintenanceModeBodySchema } from "@/lib/contracts/settings";
import Settings from "@/models/Settings";

export const dynamic = "force-dynamic";

// GET - Fetch maintenance mode status
export async function GET(request: NextRequest) {
  void request;
  try {
    await dbConnect();

    let setting = await Settings.findOne({ key: "maintenanceMode" });

    if (!setting) {
      setting = await Settings.create({
        key: "maintenanceMode",
        value: false,
        description: "Global maintenance mode flag for the website",
      });
    }

    return NextResponse.json({
      isMaintenanceMode: setting.value || false,
      updatedAt: setting.updatedAt,
    });
  } catch (error: unknown) {
    console.error("Error fetching maintenance status:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance status", isMaintenanceMode: false },
      { status: 500 }
    );
  }
}

// POST - Update maintenance mode status
export async function POST(request: NextRequest) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const parsed = await parseJsonBody(request, maintenanceModeBodySchema);
    if (parsed.error) {
      return parsed.error;
    }
    const { isMaintenanceMode } = parsed.data;

    await dbConnect();

    const setting = await Settings.findOneAndUpdate(
      { key: "maintenanceMode" },
      {
        value: isMaintenanceMode,
        description: "Global maintenance mode flag for the website",
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return NextResponse.json({
      success: true,
      isMaintenanceMode: setting!.value,
      updatedAt: setting!.updatedAt,
    });
  } catch (error: unknown) {
    console.error("Error updating maintenance status:", error);
    return NextResponse.json(
      { error: "Failed to update maintenance status" },
      { status: 500 }
    );
  }
}
