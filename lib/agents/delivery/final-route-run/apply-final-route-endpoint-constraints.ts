import type { CustomerConstraintsMap } from "@/lib/agents/delivery/candidate-plans/apply-customer-constraints";
import { toPlanningStop } from "@/lib/agents/delivery/candidate-plans/classify-stop-for-planning";
import type { RoutingStop } from "@/lib/agents/delivery/types";
import { FinalRouteCreatePayloadError } from "@/lib/agents/delivery/final-route-run/errors";
import type {
  DeliveryAgentCandidatePlanPreview,
  DeliveryAgentCandidateRunPreview,
} from "@/lib/contracts/delivery-agent";

function runHasEndPointRepair(run: DeliveryAgentCandidateRunPreview): boolean {
  return (
    run.repairActionsApplied?.some((action) => action.actionType === "apply_end_point") ?? false
  );
}

function runHasIssueType(
  run: DeliveryAgentCandidateRunPreview,
  candidate: DeliveryAgentCandidatePlanPreview,
  issueType: "dt_wrong_endpoint" | "marco_wrong_endpoint"
): boolean {
  if (run.routeShapeIssues?.some((issue) => issue.issueType === issueType)) {
    return true;
  }

  return candidate.candidateRepairSummary.issuesDetected.some(
    (issue) => issue.issueType === issueType && issue.runSlot === run.runSlot
  );
}

function pickDtEndpointOrderId(input: {
  orderIds: string[];
  routingStopByOrderId: Map<string, RoutingStop>;
}): string | undefined {
  const downtownOrderIds = input.orderIds.filter((orderId) => {
    const routingStop = input.routingStopByOrderId.get(orderId);
    if (!routingStop) {
      return false;
    }
    return toPlanningStop(routingStop).areaBucket === "core_dt";
  });

  if (downtownOrderIds.length === 0) {
    return undefined;
  }

  const withCoords = downtownOrderIds
    .map((orderId) => {
      const routingStop = input.routingStopByOrderId.get(orderId);
      if (!routingStop) {
        return null;
      }
      const coords = routingStop as RoutingStop & { lat?: number; lng?: number };
      return {
        orderId,
        lat: typeof coords.lat === "number" ? coords.lat : undefined,
      };
    })
    .filter((entry): entry is { orderId: string; lat: number | undefined } => Boolean(entry));

  const withLat = withCoords.filter(
    (entry): entry is { orderId: string; lat: number } => typeof entry.lat === "number"
  );
  if (withLat.length > 0) {
    return withLat.reduce((best, current) => (current.lat < best.lat ? current : best)).orderId;
  }

  return downtownOrderIds[downtownOrderIds.length - 1];
}

function pickMarcoEndpointOrderId(input: {
  orderIds: string[];
  routingStopByOrderId: Map<string, RoutingStop>;
}): string | undefined {
  const markhamRichmond = input.orderIds.filter((orderId) => {
    const routingStop = input.routingStopByOrderId.get(orderId);
    return routingStop?.area === "Markham" || routingStop?.area === "Richmond Hill";
  });

  if (markhamRichmond.length > 0) {
    const withLat = markhamRichmond
      .map((orderId) => {
        const routingStop = input.routingStopByOrderId.get(orderId)!;
        const coords = routingStop as RoutingStop & { lat?: number; lng?: number };
        return {
          orderId,
          lat: typeof coords.lat === "number" ? coords.lat : undefined,
        };
      })
      .filter((entry): entry is { orderId: string; lat: number } => typeof entry.lat === "number");

    if (withLat.length > 0) {
      return withLat.reduce((best, current) => (current.lat > best.lat ? current : best)).orderId;
    }

    return markhamRichmond[markhamRichmond.length - 1];
  }

  const uptownOrderIds = input.orderIds.filter((orderId) => {
    const routingStop = input.routingStopByOrderId.get(orderId);
    if (!routingStop) {
      return false;
    }
    return toPlanningStop(routingStop).areaBucket === "core_uptown";
  });

  if (uptownOrderIds.length === 0) {
    return undefined;
  }

  const withLat = uptownOrderIds
    .map((orderId) => {
      const routingStop = input.routingStopByOrderId.get(orderId)!;
      const coords = routingStop as RoutingStop & { lat?: number; lng?: number };
      return {
        orderId,
        lat: typeof coords.lat === "number" ? coords.lat : undefined,
      };
    })
    .filter((entry): entry is { orderId: string; lat: number } => typeof entry.lat === "number");

  if (withLat.length > 0) {
    return withLat.reduce((best, current) => (current.lat > best.lat ? current : best)).orderId;
  }

  return uptownOrderIds[uptownOrderIds.length - 1];
}

export function buildFinalRouteEndpointConstraints(input: {
  candidate: DeliveryAgentCandidatePlanPreview;
  run: DeliveryAgentCandidateRunPreview;
  orderIds: string[];
  routingStopByOrderId: Map<string, RoutingStop>;
}): CustomerConstraintsMap {
  const constraints: CustomerConstraintsMap = new Map();

  if (runHasEndPointRepair(input.run)) {
    return constraints;
  }

  if (
    input.run.runSlot === "A" &&
    runHasIssueType(input.run, input.candidate, "dt_wrong_endpoint")
  ) {
    const endpointOrderId = pickDtEndpointOrderId({
      orderIds: input.orderIds,
      routingStopByOrderId: input.routingStopByOrderId,
    });

    if (!endpointOrderId) {
      throw new FinalRouteCreatePayloadError(
        "DT route cannot be created because driver endpoint is unresolved. Could not determine a downtown/midtown end stop."
      );
    }

    constraints.set(endpointOrderId, { isEndPoint: true });
    return constraints;
  }

  if (
    input.run.runSlot === "B" &&
    runHasIssueType(input.run, input.candidate, "marco_wrong_endpoint")
  ) {
    const endpointOrderId = pickMarcoEndpointOrderId({
      orderIds: input.orderIds,
      routingStopByOrderId: input.routingStopByOrderId,
    });

    if (!endpointOrderId) {
      throw new FinalRouteCreatePayloadError(
        "Marco route cannot be created because driver endpoint is unresolved. Could not determine an uptown end stop."
      );
    }

    constraints.set(endpointOrderId, { isEndPoint: true });
  }

  return constraints;
}
