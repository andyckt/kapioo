import { NextResponse } from 'next/server';

export const FOUNDATION_PHASE_2A = 'phase-2a-canonical-domain-inventory' as const;

export const CANONICAL_DAILY_ORDER_DOMAIN = {
  model: 'DailyDeliveryOrder',
  userListAndCreateRoute: '/api/daily-delivery/order',
  userDetailRoute: '/api/daily-delivery/order/[id]',
  adminListRoute: '/api/admin/daily-delivery/orders',
  adminDetailRoute: '/api/admin/daily-delivery/orders/[id]',
  adminStatusRoute: '/api/admin/daily-delivery/orders/[id]/status',
} as const;

export const LEGACY_ORDER_DOMAIN = {
  model: 'Order',
  listRoute: '/api/orders',
  detailRoute: '/api/orders/[id]',
  userListRoute: '/api/users/[id]/orders',
} as const;

export const LEGACY_ORDER_CONSUMERS = [
  {
    surface: 'admin-order-management',
    file: 'components/order-management.tsx',
    routes: ['/api/orders', '/api/orders/[id]'],
  },
  {
    surface: 'user-order-history',
    file: 'components/order-history.tsx',
    routes: ['/api/users/[id]/orders', '/api/orders/[id]'],
  },
  {
    surface: 'legacy-order-stats',
    file: 'app/api/orders/stats/route.ts',
    routes: ['/api/orders/stats'],
  },
  {
    surface: 'legacy-user-order-counts',
    file: 'app/api/users/[id]/orders/count/route.ts',
    routes: ['/api/users/[id]/orders/count'],
  },
  {
    surface: 'legacy-user-order-count',
    file: 'app/api/users/[id]/order-count/route.ts',
    routes: ['/api/users/[id]/order-count'],
  },
  {
    surface: 'legacy-user-daily-orders-count',
    file: 'app/api/users/[id]/daily-orders/count/route.ts',
    routes: ['/api/users/[id]/daily-orders/count'],
  },
  {
    surface: 'legacy-user-activity',
    file: 'app/api/users/[id]/activity/route.ts',
    routes: ['/api/users/[id]/activity'],
  },
  {
    surface: 'legacy-users-with-order-counts',
    file: 'app/api/users/with-order-counts/route.ts',
    routes: ['/api/users/with-order-counts'],
  },
  {
    surface: 'legacy-notification-lookups',
    file: 'app/api/notifications/route.ts',
    routes: ['/api/notifications'],
    status: 'retired',
    notes: 'Legacy Order lookup removed; route now resolves canonical DailyDeliveryOrder by orderId.',
  },
  {
    surface: 'legacy-notification-service-types',
    file: 'lib/services/notifications.ts',
    routes: ['internal-model-dependency'],
    status: 'retired',
    notes: 'Legacy Order-based notification helpers removed; service now uses canonical daily-order notifications.',
  },
] as const;

export const BALANCE_MUTATION_ROUTE_INVENTORY = [
  {
    route: '/api/users/[id]/credits',
    file: 'app/api/users/[id]/credits/route.ts',
    primaryConsumer: 'app/admin/page.tsx',
    purpose: 'manual credit add from admin dashboard',
  },
  {
    route: '/api/users/[id]/deduct-credits',
    file: 'app/api/users/[id]/deduct-credits/route.ts',
    primaryConsumer: 'app/admin/page.tsx',
    purpose: 'manual credit deduction from admin dashboard',
  },
  {
    route: '/api/users/[id]/update-balance',
    file: 'app/api/users/[id]/update-balance/route.ts',
    primaryConsumer: 'app/admin/page.tsx',
    purpose: 'voucher and weekly-plan add/deduct operations',
  },
  {
    route: '/api/users/[id]/add-credits',
    file: 'app/api/users/[id]/add-credits/route.ts',
    primaryConsumer: 'no direct UI call found in 2A inventory',
    purpose: 'legacy manual credit add path',
  },
  {
    route: '/api/users/[id]/vouchers',
    file: 'app/api/users/[id]/vouchers/route.ts',
    primaryConsumer: 'self-or-admin voucher read path',
    purpose: 'voucher balance reads',
  },
  {
    route: '/api/credits/request/admin',
    file: 'app/api/credits/request/admin/route.ts',
    primaryConsumer: 'app/admin/page.tsx',
    purpose: 'weekly credit request approval path that also affects balances',
  },
] as const;

export function annotateLegacyOrderRoute(response: NextResponse, routePath: string) {
  response.headers.set('X-Kapioo-Order-Domain', 'legacy-order');
  response.headers.set('X-Kapioo-Order-Legacy-Route', routePath);
  response.headers.set(
    'X-Kapioo-Order-Canonical-Replacement',
    CANONICAL_DAILY_ORDER_DOMAIN.userListAndCreateRoute
  );
  response.headers.set('X-Kapioo-Foundation-Phase', FOUNDATION_PHASE_2A);
  return response;
}

export function annotateCanonicalDailyOrderRoute(response: NextResponse) {
  response.headers.set('X-Kapioo-Order-Domain', 'canonical-daily-delivery');
  response.headers.set(
    'X-Kapioo-Order-Canonical-Route',
    CANONICAL_DAILY_ORDER_DOMAIN.userListAndCreateRoute
  );
  response.headers.set('X-Kapioo-Foundation-Phase', FOUNDATION_PHASE_2A);
  return response;
}
