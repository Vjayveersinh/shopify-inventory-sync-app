# Shopify Inventory Sync App

Shopify Inventory Sync App is a Shopify embedded app built with React Router and Prisma that connects Shopify inventory with Google Sheets.

It gives you a lightweight backend that Google Apps Script can call to:

- load active Shopify locations into a sheet
- read live inventory into a `Master_Live_inventory` sheet
- push quantity updates from an `Inventory_input` sheet back to Shopify
- return audit details for each inventory update so changes can be logged

## What It Does

- Reads active Shopify locations through a protected API route
- Returns flattened live inventory rows for Google Sheets
- Updates inventory quantities by `inventoryItemId` and `locationId`
- Automatically activates inventory at a location if the item is not yet stocked there
- Returns before, requested, and after quantities for update logging
- Uses Prisma session storage for Shopify app auth

## Main API Routes

These routes are intended to be called by Google Apps Script or another trusted integration.

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/gs/health` | `GET` | Basic health check |
| `/api/gs/locations` | `GET` | Returns active Shopify locations |
| `/api/gs/master-live-inventory` | `GET` | Returns flattened live inventory rows |
| `/api/gs/sync` | `POST` | Updates inventory and returns audit details |

All Google Sheets routes use the `x-api-key` header and validate it against `GOOGLE_SHEETS_API_KEY`.

## Google Sheets Workflow

This project is designed around a spreadsheet flow like this:

### `config`

Stores Google Sheets integration values such as:

- `SHOPIFY_STORE_DOMAIN`
- `APP_BASE_URL`
- `APP_API_KEY`

### `location`

Populated from `/api/gs/locations` with:

- `Location Name`
- `Location ID`
- `Active`

### `Inventory_input`

Used to push updates to Shopify. Recommended columns:

- `SKU`
- `Product Title`
- `Variant Title`
- `Variant ID`
- `Inventory Item ID`
- one column per warehouse or location
- `Sync Status`
- `Last Sync`

### `Master_Live_inventory`

Populated from `/api/gs/master-live-inventory` with:

- `SKU`
- `Product Title`
- `Variant Title`
- `Variant ID`
- `Inventory Item ID`
- `Location Name`
- `Location ID`
- `Available Quantity`
- `Last Refreshed`

### `Inventory_Update_Log`

Optional log sheet that stores every successful update with:

- updated date and time
- source row
- product and location details
- before quantity
- requested quantity
- after quantity
- delta
- whether the location had to be activated first

## Example Sync Response

`POST /api/gs/sync` returns audit information that can be written directly into an update log:

```json
{
  "ok": true,
  "activatedLocation": false,
  "audit": {
    "inventoryItemId": "gid://shopify/InventoryItem/123",
    "locationId": "gid://shopify/Location/456",
    "sku": "sku-1",
    "productTitle": "Example Product",
    "variantTitle": "Default Title",
    "variantId": "gid://shopify/ProductVariant/789",
    "locationName": "Canada Warehouse",
    "beforeQuantity": 10,
    "requestedQuantity": 12,
    "afterQuantity": 12,
    "quantityDelta": 2,
    "updatedAt": "2026-04-21T20:00:00.000Z"
  }
}
```

## Tech Stack

- Shopify App React Router
- React Router 7
- Prisma
- SQLite for local session storage
- Google Apps Script on the spreadsheet side

## Local Development

### Prerequisites

- Node.js `>=20.19 <22` or `>=22.12`
- Shopify CLI
- A Shopify Partner account
- A development store

### Install

```bash
npm install
```

### Start local development

```bash
shopify app dev
```

### Typecheck

```bash
npm run typecheck
```

### Build

```bash
npm run build
```

## Environment Variables

Create a local `.env` file with your app credentials and integration secret.

Typical values include:

```env
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_APP_URL=https://your-app-url
SCOPES=write_products,write_metaobjects,write_metaobject_definitions,read_locations,write_inventory
GOOGLE_SHEETS_API_KEY=your_google_sheets_shared_secret
```

Notes:

- `GOOGLE_SHEETS_API_KEY` is the shared secret used by Google Apps Script
- do not commit `.env`
- rotate secrets if they were ever exposed

## Shopify Configuration

The app uses the following important Shopify access scopes:

- `read_locations`
- `write_inventory`
- `write_products`
- `write_metaobjects`
- `write_metaobject_definitions`

If you add scopes, redeploy the app configuration and reinstall or re-approve the app as needed.

## Production Notes

Before installing this app on a real store, update production settings properly:

- host the app on a stable HTTPS URL
- replace `application_url` and auth redirect URLs in `shopify.app.toml`
- deploy app configuration with `shopify app deploy`
- deploy the web app separately to your hosting provider
- use persistent session storage in production if your host does not preserve local files

The default local Prisma setup uses SQLite:

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:dev.sqlite"
}
```

SQLite is fine for local development and simple single-instance setups, but production deployments often use a managed database.

## Installing on Another Store

You can reuse this same codebase for another Shopify store, but the recommended setup is:

- create a separate app record in the Shopify Partner Dashboard
- use a separate set of app credentials
- configure the new app for the target store
- deploy the same code with the new environment variables

For multiple unrelated live stores, you may eventually want a public app. For one store or one Plus organization, custom distribution is usually the right fit.

## Project Structure

```text
app/
  google-sheets-auth.server.ts
  routes/
    api.gs.health.ts
    api.gs.locations.ts
    api.gs.master-live-inventory.ts
    api.gs.sync.ts
  shopify.server.js
prisma/
  schema.prisma
shopify.app.toml
```

## Scripts

```bash
npm run dev         # Shopify local development
npm run build       # Production build
npm run typecheck   # React Router typegen + TypeScript
npm run setup       # Prisma generate + migrate deploy
npm run deploy      # Deploy Shopify app configuration
```

## Security Notes

- Protect all Google Sheets routes with `GOOGLE_SHEETS_API_KEY`
- Never hardcode secrets in Apps Script or screenshots
- Rotate any secret that has been shared or exposed
- Limit production distribution to the intended stores

## Roadmap Ideas

- sync only changed rows from Google Sheets
- SKU lookup endpoint for `Inventory_input`
- scheduled refresh for `Master_Live_inventory`
- richer update history and rollback support
- multi-store deployment configuration

## License

Private/internal project unless you choose to add a license.
