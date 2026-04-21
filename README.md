<p align="center">
  <img src="https://cdn.worldvectorlogo.com/logos/shopify.svg" alt="Shopify Logo" width="120"/>
</p>

# 📦 Shopify Inventory Sync App

A Shopify embedded app that connects Shopify inventory with Google Sheets for location-wise stock management.

🚀 Built to help merchants manage inventory faster by using Google Sheets as an operational control panel while syncing stock updates directly with Shopify.

---

## 🔗 Project Overview

This app acts as a bridge between **Shopify** and **Google Sheets**.

It provides protected backend routes that Google Apps Script can call to:

- load active Shopify locations into a sheet
- pull live inventory into a master sheet
- push inventory updates from Google Sheets back to Shopify
- return audit details for update logging and traceability

---

## 💡 Problem

Many merchants still manage inventory operationally in spreadsheets, especially when:

- stock is reviewed by warehouse teams outside Shopify
- multiple locations need quick bulk updates
- internal teams prefer a spreadsheet workflow
- manual inventory updates in Shopify become repetitive and time-consuming

Shopify is the source of truth for inventory, but operational inventory handling is often still done in Google Sheets.

---

## 🧠 Solution

This app creates a lightweight integration layer between Shopify and Google Sheets.

Instead of updating inventory manually inside Shopify, a spreadsheet can be used as the working interface while the app handles:

- location lookup
- live inventory reads
- inventory updates by `inventoryItemId` and `locationId`
- audit-friendly responses for logging
- secure communication through protected API routes

This makes it easier to manage stock across multiple locations using a workflow teams already know.

---

## 🔥 Key Features

### 1. 📍 Load Shopify Locations
- Returns active Shopify locations through a protected API route
- Makes it easy to map Google Sheets columns to real Shopify locations
- Supports multi-location inventory workflows

---

### 2. 📊 Master Live Inventory View
- Pulls current Shopify inventory by location
- Returns flattened rows for spreadsheet-friendly display
- Helps teams review live stock in one place

---

### 3. 🔄 Push Inventory Updates from Google Sheets
- Sends updated quantities from a sheet back to Shopify
- Updates stock using `inventoryItemId` and `locationId`
- Supports location-wise inventory management

---

### 4. 🧾 Audit-Friendly Sync Responses
- Returns useful update details for logging
- Supports before/after tracking, requested quantity, and timestamps
- Makes it easier to maintain an `Inventory_Update_Log` sheet

---

### 5. 🔐 Protected Backend Routes
- Google Sheets integration routes are protected with a shared API key
- Prevents open public access to inventory endpoints
- Keeps the integration simple and controlled for internal use

---

## 🏗️ Tech Stack

**Frontend**
- Shopify App React Router
- React Router 7

**Backend**
- Node.js
- Shopify Admin API
- Shopify embedded app architecture

**Database / Session Storage**
- Prisma
- SQLite for local development

**Integration Layer**
- Google Sheets
- Google Apps Script

---

## ⚙️ How It Works

1. The Shopify app authenticates with the target store
2. Google Sheets calls protected backend routes using Apps Script
3. The app reads Shopify locations and live inventory data
4. Inventory rows are returned in a spreadsheet-friendly structure
5. Updated sheet quantities are posted back to the app
6. The app sends inventory updates to Shopify
7. Audit details can be written back into a log sheet

---

## 📄 Suggested Google Sheets Structure

### `Config`
Stores integration values such as:

- `SHOPIFY_STORE_DOMAIN`
- `APP_BASE_URL`
- `APP_API_KEY`

---

### `Locations`
Loaded from `/api/gs/locations`

Suggested columns:

- `Location Name`
- `Location ID`
- `Active`

---

### `Inventory_Input`
Used to push inventory changes to Shopify

Suggested columns:

- `SKU`
- `Product Title`
- `Variant Title`
- `Variant ID`
- `Inventory Item ID`
- one column per Shopify location
- `Sync Status`
- `Last Sync`

---

### `Master_Live_Inventory`
Loaded from `/api/gs/master-live-inventory`

Suggested columns:

- `SKU`
- `Product Title`
- `Variant Title`
- `Variant ID`
- `Inventory Item ID`
- `Location Name`
- `Location ID`
- `Available Quantity`
- `Last Refreshed`

---

### `Inventory_Update_Log` *(optional)*
Used for traceability and audit history

Suggested fields:

- update date/time
- source row
- SKU
- product and variant details
- location details
- before quantity
- requested quantity
- after quantity
- delta
- activation status if needed

---

## ✅ Current Status

Completed and working

- ✔️ Shopify app setup completed  
- ✔️ Protected API routes built  
- ✔️ Health check route working  
- ✔️ Shopify locations route working  
- ✔️ Live inventory flow implemented  
- ✔️ Google Sheets integration completed  
- ✔️ Inventory sync flow completed  
- ✔️ API key protection implemented  
- ✔️ Route-level troubleshooting and testing completed  

---

## 🛠️ Issues Faced / Troubleshooting Done

During development, I worked through several real implementation issues, including:

- Shopify app installation and scope setup
- route registration issues in React Router
- missing `loader` handling for resource routes
- TypeScript environment issues such as `Cannot find name 'process'`
- API key protection and request header validation
- PowerShell header formatting issues during endpoint testing
- GraphQL request debugging against Shopify Admin API
- app configuration and local tunnel testing with Shopify CLI

Troubleshooting included:

- fixing route module structure for backend endpoints
- updating TypeScript config to include Node types
- testing routes incrementally starting from `/api/gs/health`
- validating request headers and protected route behavior
- debugging Shopify GraphQL responses step by step
- separating authentication issues from GraphQL/query issues

---

## 📁 Project Structure

```text
app/
  routes/
    api.gs.health.ts
    api.gs.locations.ts
    api.gs.master-live-inventory.ts
    api.gs.sync.ts
  shopify.server.js

prisma/
  schema.prisma

shopify.app.toml

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

## Shopify Configuration

The app uses the following important Shopify access scopes:

- `read_locations`
- `write_inventory`
- `write_products`
- `write_metaobjects`
- `write_metaobject_definitions`

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

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
