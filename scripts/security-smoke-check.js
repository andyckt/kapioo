const baseUrl = process.env.SECURITY_TEST_BASE_URL || "http://localhost:3000";

const checks = [
  {
    name: "admin API blocks anonymous access",
    path: "/api/admin/daily-delivery/orders",
    expectedStatuses: [401, 403],
  },
  {
    name: "user export blocks anonymous access",
    path: "/api/users/export",
    expectedStatuses: [401, 403],
  },
  {
    name: "orders API blocks anonymous access",
    path: "/api/orders",
    expectedStatuses: [401],
  },
  {
    name: "transactions API blocks anonymous access",
    path: "/api/transactions",
    expectedStatuses: [401],
  },
  {
    name: "voucher request API blocks anonymous access",
    path: "/api/voucher-requests",
    expectedStatuses: [401],
  },
];

async function run() {
  let failed = 0;

  for (const check of checks) {
    const response = await fetch(`${baseUrl}${check.path}`, {
      redirect: "manual",
    });

    const ok = check.expectedStatuses.includes(response.status);
    const label = ok ? "PASS" : "FAIL";
    console.log(`${label} ${check.name}: ${response.status}`);

    if (!ok) {
      failed += 1;
    }
  }

  if (failed > 0) {
    console.error(`Security smoke check failed: ${failed} check(s) did not match expectations.`);
    process.exit(1);
  }

  console.log("Security smoke checks passed.");
}

run().catch((error) => {
  console.error("Security smoke check crashed:", error);
  process.exit(1);
});

