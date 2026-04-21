import { unauthenticated } from "../shopify.server";
import { assertGoogleSheetsApiKey } from "../google-sheets-auth.server";

export async function loader({ request }: { request: Request }) {
  assertGoogleSheetsApiKey(request);

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    throw new Response("Missing shop parameter", { status: 400 });
  }

  const { admin } = await unauthenticated.admin(shop);
  const response = await admin.graphql(`
    query GetLocations {
      locations(first: 50) {
        nodes {
          id
          name
          isActive
        }
      }
    }
  `);

  const data = await response.json();
  const locations = data?.data?.locations?.nodes;

  if (!Array.isArray(locations)) {
    throw new Response("Unable to load locations from Shopify", { status: 502 });
  }

  return Response.json({
    ok: true,
    locations,
  });
}
