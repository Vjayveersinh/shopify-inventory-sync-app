import { unauthenticated } from "../shopify.server";
import { assertGoogleSheetsApiKey } from "../google-sheets-auth.server";

const INVENTORY_PAGE_SIZE = 100;
const LOCATION_PAGE_SIZE = 50;

type MasterLiveInventoryLevel = {
  location?: {
    id?: string;
    name?: string;
  };
  quantities?: Array<{
    name?: string;
    quantity?: number | null;
  }>;
};

type MasterLiveInventoryItem = {
  id?: string;
  sku?: string | null;
  variant?: {
    id?: string;
    title?: string;
    product?: {
      title?: string;
    };
  };
  inventoryLevels?: {
    nodes?: MasterLiveInventoryLevel[];
  };
};

type MasterLiveInventoryResponse = {
  data?: {
    inventoryItems?: {
      nodes?: MasterLiveInventoryItem[];
      pageInfo?: {
        hasNextPage?: boolean;
        endCursor?: string | null;
      };
    };
  };
};

const MASTER_LIVE_INVENTORY_QUERY = `
  query MasterLiveInventory($first: Int!, $after: String) {
    inventoryItems(first: $first, after: $after) {
      nodes {
        id
        sku
        tracked
        variant {
          id
          title
          product {
            title
          }
        }
        inventoryLevels(first: ${LOCATION_PAGE_SIZE}) {
          nodes {
            location {
              id
              name
            }
            quantities(names: ["available"]) {
              name
              quantity
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

function getAvailableQuantity(level: MasterLiveInventoryLevel) {
  const quantity = level.quantities?.find((entry) => entry?.name === "available");
  return quantity?.quantity ?? 0;
}

export async function loader({ request }: { request: Request }) {
  assertGoogleSheetsApiKey(request);

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    throw new Response("Missing shop parameter", { status: 400 });
  }

  const { admin } = await unauthenticated.admin(shop);
  const lastRefreshed = new Date().toISOString();
  const rows: Array<{
    sku: string;
    productTitle: string;
    variantTitle: string;
    variantId: string;
    inventoryItemId: string;
    locationName: string;
    locationId: string;
    availableQuantity: number;
    lastRefreshed: string;
  }> = [];

  let after: string | null = null;

  while (true) {
    const response: Response = await admin.graphql(MASTER_LIVE_INVENTORY_QUERY, {
      variables: {
        first: INVENTORY_PAGE_SIZE,
        after,
      },
    });

    const data: MasterLiveInventoryResponse = await response.json();
    const inventoryItems = data?.data?.inventoryItems;
    const nodes = inventoryItems?.nodes;

    if (!Array.isArray(nodes)) {
      throw new Response("Unable to load live inventory from Shopify", {
        status: 502,
      });
    }

    for (const item of nodes) {
      const inventoryLevels = item?.inventoryLevels?.nodes;

      if (!Array.isArray(inventoryLevels) || inventoryLevels.length === 0) {
        continue;
      }

      for (const level of inventoryLevels) {
        const location = level?.location;

        if (!location?.id || !location?.name) {
          continue;
        }

        rows.push({
          sku: item?.sku ?? "",
          productTitle: item?.variant?.product?.title ?? "",
          variantTitle: item?.variant?.title ?? "",
          variantId: item?.variant?.id ?? "",
          inventoryItemId: item?.id ?? "",
          locationName: location.name,
          locationId: location.id,
          availableQuantity: getAvailableQuantity(level),
          lastRefreshed,
        });
      }
    }

    if (!inventoryItems?.pageInfo?.hasNextPage || !inventoryItems?.pageInfo?.endCursor) {
      break;
    }

    after = inventoryItems.pageInfo.endCursor;
  }

  return Response.json({
    ok: true,
    rows,
    lastRefreshed,
    totalRows: rows.length,
  });
}
