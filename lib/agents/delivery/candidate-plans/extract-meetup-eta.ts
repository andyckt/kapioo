import { extractOptimizedRouteStops } from "@/lib/agents/delivery/map-route-optimizer-preview-result";
import type { DeliveryAgentSimpleRoutePreviewStop } from "@/lib/contracts/delivery-agent";
import type { RouteOptimizerRunResult } from "@/lib/integrations/route-optimizer/types";

export type MeetupEtaExtractionResult = {
  meetupEta?: string;
  meetupSequence?: number;
};

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function matchesMeetupStop(
  record: Record<string, unknown>,
  meetupName: string,
  expectedSequence?: number
): boolean {
  const name = readString(record.customer_name ?? record.name);
  const stopType = readString(record.stop_type);
  const isSynthetic = record.is_synthetic === true;
  const sequence = readNumber(record.sequence);

  if (name?.toLowerCase() === meetupName.toLowerCase()) {
    return true;
  }

  if (isSynthetic && stopType === "handoff") {
    if (expectedSequence === undefined || sequence === expectedSequence) {
      return true;
    }
  }

  return false;
}

function readEtaFromRecord(record: Record<string, unknown>): string | undefined {
  return (
    readString(record.eta) ||
    readString(record.arrival_time) ||
    readString(record.estimated_arrival_time)
  );
}

export function extractMeetupEtaFromMappedStops(input: {
  optimizedStops: DeliveryAgentSimpleRoutePreviewStop[];
  meetupName: string;
  expectedSequence?: number;
}): MeetupEtaExtractionResult {
  for (const stop of input.optimizedStops) {
    const sequenceMatches =
      input.expectedSequence === undefined || stop.sequence === input.expectedSequence;
    const nameMatches = stop.name?.toLowerCase() === input.meetupName.toLowerCase();

    if (nameMatches && sequenceMatches && stop.eta) {
      return {
        meetupEta: stop.eta,
        meetupSequence: stop.sequence,
      };
    }
  }

  for (const stop of input.optimizedStops) {
    if (stop.name?.toLowerCase() === input.meetupName.toLowerCase() && stop.eta) {
      return {
        meetupEta: stop.eta,
        meetupSequence: stop.sequence,
      };
    }
  }

  if (input.expectedSequence !== undefined) {
    const bySequence = input.optimizedStops.find((stop) => stop.sequence === input.expectedSequence);
    if (
      bySequence?.eta &&
      bySequence.name?.toLowerCase() === input.meetupName.toLowerCase()
    ) {
      return {
        meetupEta: bySequence.eta,
        meetupSequence: bySequence.sequence,
      };
    }
  }

  return {};
}

export function extractMeetupEtaFromRouteResult(input: {
  routeResult: RouteOptimizerRunResult;
  meetupName: string;
  expectedSequence?: number;
}): MeetupEtaExtractionResult {
  const rawStops = extractOptimizedRouteStops(input.routeResult);

  for (let index = 0; index < rawStops.length; index += 1) {
    const stop = rawStops[index];
    if (!stop || typeof stop !== "object") {
      continue;
    }

    const record = stop as Record<string, unknown>;
    const sequence = readNumber(record.sequence) ?? index + 1;

    if (
      matchesMeetupStop(record, input.meetupName, input.expectedSequence) &&
      (input.expectedSequence === undefined || sequence === input.expectedSequence)
    ) {
      const eta = readEtaFromRecord(record);
      if (eta) {
        return { meetupEta: eta, meetupSequence: sequence };
      }
    }
  }

  return {};
}

export function extractMeetupEtaFromPreview(input: {
  optimizedStops: DeliveryAgentSimpleRoutePreviewStop[];
  routeResult?: RouteOptimizerRunResult;
  meetupName: string;
  expectedSequence?: number;
}): MeetupEtaExtractionResult {
  const fromMapped = extractMeetupEtaFromMappedStops({
    optimizedStops: input.optimizedStops,
    meetupName: input.meetupName,
    expectedSequence: input.expectedSequence,
  });

  if (fromMapped.meetupEta) {
    return fromMapped;
  }

  if (input.routeResult) {
    return extractMeetupEtaFromRouteResult({
      routeResult: input.routeResult,
      meetupName: input.meetupName,
      expectedSequence: input.expectedSequence,
    });
  }

  return {};
}
