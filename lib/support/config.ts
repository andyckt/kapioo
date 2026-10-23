import Settings from "@/models/Settings";

export async function getSupportConfig() {
  const record = await Settings.findOne({ key: "supportAssistant" }).lean<{ value?: { aiEnabled?: boolean; monthlyCapUsd?: number } }>();
  const value = record?.value || {};
  const requestedCap = Number(value.monthlyCapUsd ?? 30);
  return {
    aiEnabled: value.aiEnabled === true && process.env.SUPPORT_AI_ENABLED === "true" && Boolean(process.env.OPENAI_API_KEY),
    aiRequested: value.aiEnabled === true,
    apiConfigured: Boolean(process.env.OPENAI_API_KEY),
    publicEnabled: process.env.SUPPORT_PUBLIC_ENABLED === "true",
    selfServiceEnabled: process.env.NEXT_PUBLIC_SELF_SERVICE_ENABLED === "true",
    monthlyCapMicros: Number.isFinite(requestedCap) ? Math.round(Math.min(1000, Math.max(0, requestedCap)) * 1_000_000) : 0,
  };
}
