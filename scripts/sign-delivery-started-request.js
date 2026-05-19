#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");

const [, , payloadPath, baseUrl = "http://localhost:3000"] = process.argv;
const token = process.env.ROUTE_OPTIMIZER_INGEST_TOKEN;
const secret = process.env.ROUTE_OPTIMIZER_INGEST_SECRET;

if (!payloadPath || !token || !secret) {
  console.error(
    [
      "Usage:",
      "  ROUTE_OPTIMIZER_INGEST_TOKEN=xxx ROUTE_OPTIMIZER_INGEST_SECRET=yyy \\",
      "  node scripts/sign-delivery-started-request.js ./payload.json http://localhost:3000",
    ].join("\n")
  );
  process.exit(1);
}

const rawBody = fs.readFileSync(payloadPath, "utf8");
const signature = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
const endpoint = `${baseUrl.replace(/\/+$/, "")}/api/integrations/route-optimizer/delivery-started`;

console.log(
  [
    `curl -sS -X POST '${endpoint}' \\`,
    `  -H 'Authorization: Bearer ${token}' \\`,
    `  -H 'X-RO-Signature: ${signature}' \\`,
    "  -H 'Content-Type: application/json' \\",
    `  --data-binary @${payloadPath}`,
  ].join("\n")
);
