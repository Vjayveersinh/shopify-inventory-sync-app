export async function loader() {
  return Response.json({
    ok: true,
    message: "Google Sheets API route is working",
  });
}