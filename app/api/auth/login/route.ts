export async function POST(request: Request) {
  void request;
  return Response.json(
    {
      success: false,
      error: "Deprecated login route. Use the Auth.js credentials flow instead.",
    },
    { status: 410 }
  );
} 