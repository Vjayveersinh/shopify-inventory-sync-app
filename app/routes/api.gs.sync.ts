import { unauthenticated } from "../shopify.server";
import { assertGoogleSheetsApiKey } from "../google-sheets-auth.server";

type ShopifyUserError = {
  field?: string[];
  message?: string;
  code?: string;
};

type InventorySetQuantitiesPayload = {
  inventoryAdjustmentGroup?: {
    createdAt?: string;
    reason?: string;
  } | null;
  userErrors?: ShopifyUserError[];
};

type InventorySetQuantitiesResponse = {
  data?: {
    inventorySetQuantities?: InventorySetQuantitiesPayload;
  };
};

type InventoryActivationPayload = {
  inventoryLevels?: Array<{
    id?: string;
    location?: {
      id?: string;
    };
  }>;
  userErrors?: ShopifyUserError[];
};

type InventoryActivationResponse = {
  data?: {
    inventoryBulkToggleActivation?: InventoryActivationPayload;
  };
};

type InventoryLevelSnapshot = {
  location?: {
    id?: string;
    name?: string;
  };
  quantities?: Array<{
    name?: string;
    quantity?: number | null;
  }>;
};

type InventoryItemSnapshot = {
  sku?: string | null;
  variant?: {
    id?: string;
    title?: string;
    product?: {
      title?: string;
    };
  };
  inventoryLevels?: {
    nodes?: InventoryLevelSnapshot[];
  };
};

type InventorySnapshotResponse = {
  data?: {
    inventoryItem?: InventoryItemSnapshot | null;
  };
};

const SET_INVENTORY_MUTATION = `
  mutation SetInventory($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      inventoryAdjustmentGroup {
        createdAt
        reason
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const ACTIVATE_INVENTORY_MUTATION = `
  mutation ActivateInventoryAtLocation(
    $inventoryItemId: ID!
    $inventoryItemUpdates: [InventoryBulkToggleActivationInput!]!
  ) {
    inventoryBulkToggleActivation(
      inventoryItemId: $inventoryItemId
      inventoryItemUpdates: $inventoryItemUpdates
    ) {
      inventoryLevels {
        id
        location {
          id
        }
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const INVENTORY_SNAPSHOT_QUERY = `
  query InventorySnapshot($inventoryItemId: ID!) {
    inventoryItem(id: $inventoryItemId) {
      sku
      variant {
        id
        title
        product {
          title
        }
      }
      inventoryLevels(first: 100) {
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
  }
`;

function getAvailableQuantity(
  quantities: Array<{ name?: string; quantity?: number | null }> | undefined,
) {
  const entry = quantities?.find((item) => item?.name === "available");
  return entry?.quantity ?? null;
}

async function getInventorySnapshot(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
  inventoryItemId: string,
  locationId: string,
) {
  const response: Response = await admin.graphql(INVENTORY_SNAPSHOT_QUERY, {
    variables: {
      inventoryItemId,
    },
  });

  const data: InventorySnapshotResponse = await response.json();
  const inventoryItem = data?.data?.inventoryItem;
  const level = inventoryItem?.inventoryLevels?.nodes?.find(
    (node) => node?.location?.id === locationId,
  );

  return {
    sku: inventoryItem?.sku ?? "",
    productTitle: inventoryItem?.variant?.product?.title ?? "",
    variantTitle: inventoryItem?.variant?.title ?? "",
    variantId: inventoryItem?.variant?.id ?? "",
    locationName: level?.location?.name ?? "",
    quantity: getAvailableQuantity(level?.quantities),
    stockedAtLocation: Boolean(level?.location?.id),
  };
}

async function setInventoryQuantity(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
  inventoryItemId: string,
  locationId: string,
  quantity: number,
) {
  const response: Response = await admin.graphql(SET_INVENTORY_MUTATION, {
    variables: {
      input: {
        ignoreCompareQuantity: true,
        name: "available",
        reason: "correction",
        quantities: [
          {
            inventoryItemId,
            locationId,
            quantity,
          },
        ],
      },
    },
  });

  const data: InventorySetQuantitiesResponse = await response.json();
  return data?.data?.inventorySetQuantities ?? null;
}

async function activateInventoryAtLocation(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
  inventoryItemId: string,
  locationId: string,
) {
  const response: Response = await admin.graphql(ACTIVATE_INVENTORY_MUTATION, {
    variables: {
      inventoryItemId,
      inventoryItemUpdates: [
        {
          locationId,
          activate: true,
        },
      ],
    },
  });

  const data: InventoryActivationResponse = await response.json();
  return data?.data?.inventoryBulkToggleActivation ?? null;
}

function isItemNotStockedAtLocation(userErrors: ShopifyUserError[]) {
  return userErrors.some((error) => {
    const field = error.field ?? [];
    const message = error.message ?? "";

    return field.includes("locationId") && /not stocked at the location/i.test(message);
  });
}

export async function action({ request }: { request: Request }) {
  assertGoogleSheetsApiKey(request);

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    throw new Response("Missing shop parameter", { status: 400 });
  }

  const body = await request.json();
  const { inventoryItemId, locationId, quantity } = body;
  const requestedQuantity = Number(quantity);

  if (!inventoryItemId || !locationId || quantity === undefined || quantity === null) {
    throw new Response("Missing inventoryItemId, locationId, or quantity", { status: 400 });
  }

  if (!Number.isFinite(requestedQuantity)) {
    throw new Response("Quantity must be a valid number", { status: 400 });
  }

  const { admin } = await unauthenticated.admin(shop);
  const beforeSnapshot = await getInventorySnapshot(admin, inventoryItemId, locationId);
  let result = await setInventoryQuantity(
    admin,
    inventoryItemId,
    locationId,
    requestedQuantity,
  );
  let userErrors = result?.userErrors ?? [];
  let activatedLocation = false;

  if (!result) {
    throw new Response("Unable to update inventory in Shopify", { status: 502 });
  }

  if (isItemNotStockedAtLocation(userErrors)) {
    const activationResult = await activateInventoryAtLocation(
      admin,
      inventoryItemId,
      locationId,
    );

    const activationErrors = activationResult?.userErrors ?? [];

    if (activationErrors.length > 0) {
      return Response.json(
        {
          ok: false,
          userErrors: activationErrors,
          stage: "activate",
        },
        { status: 422 }
      );
    }

    activatedLocation = true;
    result = await setInventoryQuantity(
      admin,
      inventoryItemId,
      locationId,
      requestedQuantity,
    );
    userErrors = result?.userErrors ?? [];

    if (!result) {
      throw new Response("Unable to update inventory in Shopify", { status: 502 });
    }
  }

  if (userErrors.length > 0) {
    return Response.json(
      {
        ok: false,
        userErrors,
        stage: activatedLocation ? "set-after-activate" : "set",
      },
      { status: 422 }
    );
  }

  const afterSnapshot = await getInventorySnapshot(admin, inventoryItemId, locationId);
  const beforeQuantity = beforeSnapshot.quantity;
  const afterQuantity = afterSnapshot.quantity ?? requestedQuantity;

  return Response.json({
    ok: true,
    result,
    activatedLocation,
    audit: {
      inventoryItemId,
      locationId,
      sku: afterSnapshot.sku || beforeSnapshot.sku,
      productTitle: afterSnapshot.productTitle || beforeSnapshot.productTitle,
      variantTitle: afterSnapshot.variantTitle || beforeSnapshot.variantTitle,
      variantId: afterSnapshot.variantId || beforeSnapshot.variantId,
      locationName: afterSnapshot.locationName || beforeSnapshot.locationName,
      beforeQuantity,
      requestedQuantity,
      afterQuantity,
      quantityDelta: afterQuantity - (beforeQuantity ?? 0),
      updatedAt: new Date().toISOString(),
    },
  });
}
