import type { DeliveryAgentLearningCoordinateSnapshot } from "@/lib/contracts/delivery-agent-learning";

import { hasFiniteLatLng } from "@/lib/agents/delivery/learning/coordinates/is-finite-coordinate";
import { haversineDistanceMeters } from "@/lib/agents/delivery/learning/geo-features/distance";
import type { GeoPoint } from "@/lib/agents/delivery/learning/geo-features/types";

const DEFAULT_MAX_DISTANCE_METERS = 50;

type OrderPoint = {
  orderId: string;
  point: GeoPoint;
};

function computeClusterCenter(points: GeoPoint[]): GeoPoint {
  const totals = points.reduce(
    (accumulator, point) => ({
      lat: accumulator.lat + point.lat,
      lng: accumulator.lng + point.lng,
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: totals.lat / points.length,
    lng: totals.lng / points.length,
  };
}

export function detectSameBuildingClusters(args: {
  snapshots: DeliveryAgentLearningCoordinateSnapshot[];
  maxDistanceMeters?: number;
}): Array<{
  clusterId: string;
  orderIds: string[];
  center?: { lat: number; lng: number } | null;
}> {
  const maxDistanceMeters = args.maxDistanceMeters ?? DEFAULT_MAX_DISTANCE_METERS;
  const orderPoints: OrderPoint[] = args.snapshots
    .filter(
      (snapshot) =>
        snapshot.refType === "order" &&
        snapshot.orderId &&
        hasFiniteLatLng(snapshot)
    )
    .map((snapshot) => ({
      orderId: snapshot.orderId as string,
      point: { lat: snapshot.lat as number, lng: snapshot.lng as number },
    }));

  if (orderPoints.length < 2) {
    return [];
  }

  const parent = orderPoints.map((_, index) => index);

  function find(index: number): number {
    if (parent[index] !== index) {
      parent[index] = find(parent[index]!);
    }
    return parent[index]!;
  }

  function union(a: number, b: number): void {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      parent[rootB] = rootA;
    }
  }

  for (let i = 0; i < orderPoints.length; i += 1) {
    for (let j = i + 1; j < orderPoints.length; j += 1) {
      const distanceMeters = haversineDistanceMeters(
        orderPoints[i]!.point,
        orderPoints[j]!.point
      );
      if (distanceMeters <= maxDistanceMeters) {
        union(i, j);
      }
    }
  }

  const groups = new Map<number, OrderPoint[]>();
  for (let index = 0; index < orderPoints.length; index += 1) {
    const root = find(index);
    const group = groups.get(root) ?? [];
    group.push(orderPoints[index]!);
    groups.set(root, group);
  }

  const clusters = [...groups.values()]
    .filter((group) => group.length >= 2)
    .sort((a, b) => a[0]!.orderId.localeCompare(b[0]!.orderId))
    .map((group, index) => {
      const points = group.map((entry) => entry.point);
      return {
        clusterId: `same-building-${index + 1}`,
        orderIds: group.map((entry) => entry.orderId).sort(),
        center: computeClusterCenter(points),
      };
    });

  return clusters;
}
