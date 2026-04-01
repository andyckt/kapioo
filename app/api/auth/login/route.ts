import { errorJson } from "@/lib/api";

export async function POST(request: Request) {
  void request;
  return errorJson(
    "Deprecated login route. Use the Auth.js credentials flow instead.",
    410
  );
}
