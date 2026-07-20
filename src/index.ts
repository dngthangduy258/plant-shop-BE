/**
 * Plant Shop POS - Cloudflare Workers API
 * Backend với Hono.js
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/cloudflare-workers';

import type { Env } from './db/helpers';
import { successResponse, errorResponse, generateId, generateInvoiceNumber } from './db/helpers';

// Import routes
import { productsRoute } from './routes/products';
import { customersRoute } from './routes/customers';
import { invoicesRoute } from './routes/invoices';
import { debtsRoute } from './routes/debts';
import { reportsRoute } from './routes/reports';
import { categoriesRoute } from './routes/categories';
import { storeRoute } from './routes/store';

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', cors({
  origin: '*', // Update this to your domain in production
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use('*', logger());

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Plant Shop POS API',
    version: '1.0.0'
  });
});

// API Routes
app.route('/api/categories', categoriesRoute);
app.route('/api/products', productsRoute);
app.route('/api/customers', customersRoute);
app.route('/api/invoices', invoicesRoute);
app.route('/api/debts', debtsRoute);
app.route('/api/reports', reportsRoute);
app.route('/api/store', storeRoute);

// Root route
app.get('/', (c) => {
  return c.json({
    name: 'Plant Shop POS API',
    version: '1.0.0',
    description: 'API for Plant Protection Store POS System',
    endpoints: {
      health: '/api/health',
      categories: '/api/categories',
      products: '/api/products',
      customers: '/api/customers',
      invoices: '/api/invoices',
      debts: '/api/debts',
      reports: '/api/reports',
      store: '/api/store'
    }
  });
});

// 404 handler
app.notFound((c) => {
  return errorResponse('Endpoint not found', 404);
});

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return errorResponse('Internal server error', 500, err.message);
});

// Export for Cloudflare Workers
export default {
  fetch: app.fetch,
  scheduled: async (controller: any, env: Env, ctx: any) => {
    // Scheduled tasks (e.g., cleanup expired sessions)
    console.log('Scheduled task triggered');
  }
};
