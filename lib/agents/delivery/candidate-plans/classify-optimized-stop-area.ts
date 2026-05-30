import { toPlanningStop } from "@/lib/agents/delivery/candidate-plans/classify-stop-for-planning";
import type { PlanningAreaBucket } from "@/lib/agents/delivery/candidate-plans/types";
import type {
  DeliveryAgentCandidatePlanStop,
  DeliveryAgentSimpleRoutePreviewStop,
} from "@/lib/contracts/delivery-agent";
import type { RoutingStop } from "@/lib/agents/delivery/types";

export type ClassifiedOptimizedStop = {
  sequence: number;
  name?: string;
  address?: string;
  orderIds: string[];
  areaBucket: PlanningAreaBucket;
  area?: string;
  lat?: number;
  lng?: number;
  isSyntheticMeetup: boolean;
};

function readOptionalCoordinate(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readCoordinatesFromRoutingStop(routingStop: RoutingStop): { lat?: number; lng?: number } {
  const raw = routingStop as RoutingStop & {
    lat?: number;
    lng?: number;
    deliveryAddress?: { lat?: number; lng?: number };
  };

  return {
    lat: readOptionalCoordinate(raw.lat ?? raw.deliveryAddress?.lat),
    lng: readOptionalCoordinate(raw.lng ?? raw.deliveryAddress?.lng),
  };
}

function findCandidateStop(
  orderIds: string[],
  candidateStops: DeliveryAgentCandidatePlanStop[]
): DeliveryAgentCandidatePlanStop | undefined {
  for (const orderId of orderIds) {
    const match = candidateStops.find((stop) => stop.orderId === orderId);
    if (match) {
      return match;
    }
  }

  return undefined;
}

export function isSyntheticMeetupStop(
  stop: Pick<DeliveryAgentSimpleRoutePreviewStop, "name" | "orderIds">,
  meetupName: string
): boolean {
  if (stop.orderIds.length === 0 && stop.name?.toLowerCase() === meetupName.toLowerCase()) {
    return true;
  }

  return false;
}

export function classifyOptimizedStop(input: {
  stop: DeliveryAgentSimpleRoutePreviewStop;
  candidateStops: DeliveryAgentCandidatePlanStop[];
  routingStopByOrderId: Map<string, RoutingStop>;
  meetupName: string;
}): ClassifiedOptimizedStop {
  if (isSyntheticMeetupStop(input.stop, input.meetupName)) {
    return {
      sequence: input.stop.sequence,
      name: input.stop.name,
      address: input.stop.address,
      orderIds: input.stop.orderIds,
      areaBucket: "flexible_north_york",
      area: "North York",
      isSyntheticMeetup: true,
    };
  }

  const candidateStop = findCandidateStop(input.stop.orderIds, input.candidateStops);
  const routingStop = input.stop.orderIds
    .map((orderId) => input.routingStopByOrderId.get(orderId))
    .find(Boolean);

  if (routingStop) {
    const planningStop = toPlanningStop(routingStop);
    return {
      sequence: input.stop.sequence,
      name: input.stop.name ?? planningStop.customerName,
      address: input.stop.address ?? planningStop.formattedAddress,
      orderIds: input.stop.orderIds,
      areaBucket: planningStop.areaBucket,
      area: planningStop.area,
      lat: planningStop.lat,
      lng: planningStop.lng,
      isSyntheticMeetup: false,
    };
  }

  if (candidateStop) {
    const coords = routingStop
      ? readCoordinatesFromRoutingStop(routingStop)
      : { lat: candidateStop.lat, lng: candidateStop.lng };

    const pseudoRoutingStop = {
      orderId: candidateStop.orderId,
      customerName: candidateStop.customerName,
      area: candidateStop.area,
      formattedAddress: candidateStop.formattedAddress,
      totalMealQuantity: candidateStop.totalMealQuantity,
      routeOptimizer: {
        name: candidateStop.customerName,
        address: candidateStop.formattedAddress,
        order_ids: [candidateStop.orderId],
      },
      ...coords,
    } as RoutingStop;

    const planningStop = toPlanningStop(pseudoRoutingStop);

    return {
      sequence: input.stop.sequence,
      name: input.stop.name ?? candidateStop.customerName,
      address: input.stop.address ?? candidateStop.formattedAddress,
      orderIds: input.stop.orderIds.length > 0 ? input.stop.orderIds : [candidateStop.orderId],
      areaBucket: planningStop.areaBucket,
      area: planningStop.area,
      lat: planningStop.lat,
      lng: planningStop.lng,
      isSyntheticMeetup: false,
    };
  }

  return {
    sequence: input.stop.sequence,
    name: input.stop.name,
    address: input.stop.address,
    orderIds: input.stop.orderIds,
    areaBucket: "unknown",
    isSyntheticMeetup: false,
  };
}

export function classifyOptimizedStops(input: {
  optimizedStops: DeliveryAgentSimpleRoutePreviewStop[];
  candidateStops: DeliveryAgentCandidatePlanStop[];
  routingStopByOrderId: Map<string, RoutingStop>;
  meetupName: string;
}): ClassifiedOptimizedStop[] {
  return input.optimizedStops.map((stop) =>
    classifyOptimizedStop({
      stop,
      candidateStops: input.candidateStops,
      routingStopByOrderId: input.routingStopByOrderId,
      meetupName: input.meetupName,
    })
  );
}

export function isNorthernAreaBucket(bucket: PlanningAreaBucket): boolean {
  return bucket === "flexible_north_york" || bucket === "core_uptown";
}

export function isSouthernAreaBucket(bucket: PlanningAreaBucket): boolean {
  return bucket === "core_dt";
}
