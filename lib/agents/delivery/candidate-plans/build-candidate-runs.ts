import type {
  CandidatePlanStop,
  CandidateRun,
  PlanningStop,
  StopAssignment,
} from "@/lib/agents/delivery/candidate-plans/types";
import type { DeliveryPlanningProfile } from "@/lib/agents/delivery/planning-profile/types";

function toCandidatePlanStop(stop: PlanningStop): CandidatePlanStop {
  return {
    orderId: stop.orderId,
    customerName: stop.customerName,
    area: stop.area,
    formattedAddress: stop.formattedAddress,
    lat: stop.lat,
    lng: stop.lng,
    totalMealQuantity: stop.totalMealQuantity,
    planningTags: stop.planningTags,
  };
}

function buildAreaBreakdown(stops: PlanningStop[]): Record<string, number> {
  const byArea: Record<string, number> = {};

  for (const stop of stops) {
    const area = stop.area.trim() || "Unknown";
    byArea[area] = (byArea[area] ?? 0) + 1;
  }

  return byArea;
}

function getDriver(profile: DeliveryPlanningProfile, runSlot: "A" | "B" | "C") {
  const driver = profile.drivers.find((entry) => entry.runSlot === runSlot);
  if (!driver) {
    throw new Error(`Planning profile is missing driver run slot ${runSlot}`);
  }
  return driver;
}

function buildRun(
  profile: DeliveryPlanningProfile,
  runSlot: "A" | "B" | "C",
  stops: PlanningStop[]
): CandidateRun {
  const driver = getDriver(profile, runSlot);

  let startType = "kitchen";
  let startLocationLabel = "Kitchen";
  let plannedStartTimeSource = "profile.timeRules.normalKitchenStartTime";

  if (runSlot === "B") {
    startType = "handoff";
    startLocationLabel = "Handoff (meet-up later)";
    plannedStartTimeSource = "profile.handoffRules.receiverStartTimeSource";
  } else if (runSlot === "C") {
    startType = "kitchen_or_assigned";
    startLocationLabel = "Self / assigned";
    plannedStartTimeSource = "self_fallback";
  }

  return {
    runSlot,
    driverName: driver.defaultDriverName,
    role: driver.role,
    startType,
    startLocationLabel,
    stops: stops.map(toCandidatePlanStop),
    stopCount: stops.length,
    areaBreakdown: buildAreaBreakdown(stops),
    totalMealQuantity: stops.reduce((sum, stop) => sum + stop.totalMealQuantity, 0),
    plannedStartTimeSource,
    constraintPlan: {
      fixedStops: [],
      endPoint: null,
      repairActionsPlanned: [],
    },
  };
}

export function buildCandidateRunsFromAssignment(
  profile: DeliveryPlanningProfile,
  assignment: StopAssignment
): CandidateRun[] {
  const runs: CandidateRun[] = [
    buildRun(profile, "A", assignment.dt),
    buildRun(profile, "B", assignment.marco),
  ];

  if (assignment.self.length > 0) {
    runs.push(buildRun(profile, "C", assignment.self));
  }

  return runs;
}

export function buildDefaultHandoffPlan(profile: DeliveryPlanningProfile) {
  return {
    providerRunSlot: profile.handoffRules.providerRunSlot,
    receiverRunSlot: profile.handoffRules.receiverRunSlots[0] ?? "B",
    mode: "synthetic_handoff_stop_later" as const,
    note: "Meet-up point will be selected and previewed in a later milestone.",
  };
}
