# Plant Shop - Backend API

Cloudflare Workers backend for Plant Shop POS system.

## Tech Stack

- Cloudflare Workers
- Hono.js
- Cloudflare D1 (Database)
- Cloudflare R2 (File Storage)

## API Endpoints

- `/api/products` - Products CRUD
- `/api/customers` - Customers CRUD
- `/api/invoices` - Invoices & Sales
- `/api/debts` - Debt tracking
- `/api/reports` - Tax reports

## Setup

1. Create D1 Database: `wrangler d1 create plant-shop`
2. Run migrations: `wrangler d1 migrations apply plant-shop`
3. Deploy: `wrangler deploy`

## Deploy

Connect to Cloudflare Workers from GitHub for auto-deploy.
