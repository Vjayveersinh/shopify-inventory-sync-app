export function assertGoogleSheetsApiKey(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  const expected = process.env.GOOGLE_SHEETS_API_KEY;

  if (!expected) {
    throw new Response("Missing GOOGLE_SHEETS_API_KEY configuration", {
      status: 500,
    });
  }

  if (apiKey !== expected) {
    throw new Response("Unauthorized", { status: 401 });
  }
}
