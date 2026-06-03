import type { DeliveryAgentLearningLatenessAttribution } from "@/lib/contracts/delivery-agent-learning";

import {
  computeDeadlineBufferMinutes,
} from "@/lib/agents/delivery/learning/outcome/compute-deadline-buffer";

export function computeLatenessAttribution(args: {
  deliveryDate: string;
  actualFinishTime?: string | null;
  normalizedFinishTimeIfStartedOnTime?: string | null;
  startDelayMinutes?: number | null;
  meaningfulStartDelayMinutes?: number;
  deadlineTime?: string;
}): {
  latenessAttribution: DeliveryAgentLearningLatenessAttribution;
  routeWouldHaveMetDeadlineIfStartedOnTime: boolean | null;
  actualLateMinutes: number | null;
  normalizedDeadlineBufferMinutes: number | null;
  warnings: string[];
} {
  const warnings: string[] = [];
  const meaningfulStartDelayMinutes = args.meaningfulStartDelayMinutes ?? 10;
  const deadlineTime = args.deadlineTime ?? "13:00";

  if (!args.actualFinishTime) {
    return {
      latenessAttribution: "unknown",
      routeWouldHaveMetDeadlineIfStartedOnTime: null,
      actualLateMinutes: null,
      normalizedDeadlineBufferMinutes: null,
      warnings: ["actual_finish_time_missing"],
    };
  }

  const actualDeadlineBufferMinutes = computeDeadlineBufferMinutes({
    deliveryDate: args.deliveryDate,
    finishTime: args.actualFinishTime,
    deadlineTime,
  });

  if (actualDeadlineBufferMinutes === null) {
    return {
      latenessAttribution: "unknown",
      routeWouldHaveMetDeadlineIfStartedOnTime: null,
      actualLateMinutes: null,
      normalizedDeadlineBufferMinutes: null,
      warnings: ["actual_finish_time_unparseable"],
    };
  }

  const actualLateMinutes = actualDeadlineBufferMinutes < 0 ? Math.abs(actualDeadlineBufferMinutes) : 0;

  if (actualDeadlineBufferMinutes >= 0) {
    return {
      latenessAttribution: "on_time",
      routeWouldHaveMetDeadlineIfStartedOnTime: true,
      actualLateMinutes: 0,
      normalizedDeadlineBufferMinutes: actualDeadlineBufferMinutes,
      warnings,
    };
  }

  const startDelayMinutes = args.startDelayMinutes ?? 0;
  const normalizedDeadlineBufferMinutes = args.normalizedFinishTimeIfStartedOnTime
    ? computeDeadlineBufferMinutes({
        deliveryDate: args.deliveryDate,
        finishTime: args.normalizedFinishTimeIfStartedOnTime,
        deadlineTime,
      })
    : null;

  if (startDelayMinutes >= meaningfulStartDelayMinutes) {
    if (normalizedDeadlineBufferMinutes === null) {
      warnings.push("normalized_finish_time_unavailable");
      return {
        latenessAttribution: "unknown",
        routeWouldHaveMetDeadlineIfStartedOnTime: null,
        actualLateMinutes,
        normalizedDeadlineBufferMinutes: null,
        warnings,
      };
    }

    if (normalizedDeadlineBufferMinutes >= 0) {
      return {
        latenessAttribution: "driver_start_delay",
        routeWouldHaveMetDeadlineIfStartedOnTime: true,
        actualLateMinutes,
        normalizedDeadlineBufferMinutes,
        warnings,
      };
    }

    return {
      latenessAttribution: "mixed",
      routeWouldHaveMetDeadlineIfStartedOnTime: false,
      actualLateMinutes,
      normalizedDeadlineBufferMinutes,
      warnings,
    };
  }

  return {
    latenessAttribution: "route_problem",
    routeWouldHaveMetDeadlineIfStartedOnTime:
      normalizedDeadlineBufferMinutes === null ? null : normalizedDeadlineBufferMinutes >= 0,
    actualLateMinutes,
    normalizedDeadlineBufferMinutes,
    warnings,
  };
}
