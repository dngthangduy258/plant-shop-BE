/**
 * Store Settings Routes
 */

import { Hono } from 'hono';
import type { Env } from '../db/helpers';
import { successResponse, errorResponse } from '../db/helpers';

export const storeRoute = new Hono<{ Bindings: Env }>();

// Get store info
storeRoute.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM store LIMIT 1
    `).all();
    
    if (results.length === 0) {
      return errorResponse('Store not found', 404);
    }
    
    return successResponse(results[0]);
  } catch (err) {
    console.error('Error fetching store:', err);
    return errorResponse('Failed to fetch store info');
  }
});

// Update store
storeRoute.put('/', async (c) => {
  const body = await c.req.json();
  
  try {
    await c.env.DB.prepare(`
      UPDATE store SET
        name = COALESCE(?, name),
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        tax_code = COALESCE(?, tax_code),
        logo_url = COALESCE(?, logo_url),
        updated_at = datetime('now')
      WHERE id = 'default-store'
    `).bind(
      body.name,
      body.address,
      body.phone,
      body.tax_code,
      body.logo_url
    ).run();
    
    const { results } = await c.env.DB.prepare('SELECT * FROM store LIMIT 1').all();
    return successResponse(results[0], 'Store updated successfully');
  } catch (err) {
    console.error('Error updating store:', err);
    return errorResponse('Failed to update store');
  }
});

// Get suppliers
storeRoute.get('/suppliers', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name
    `).all();
    return successResponse(results);
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    return errorResponse('Failed to fetch suppliers');
  }
});

// Create supplier
storeRoute.post('/suppliers', async (c) => {
  const body = await c.req.json();
  
  const id = body.id || `sup_${Date.now()}`;
  const code = body.code || `NCC${Date.now()}`;
  
  try {
    await c.env.DB.prepare(`
      INSERT INTO suppliers (id, code, name, phone, email, address, contact_person)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, code, body.name, body.phone, body.email, body.address, body.contact_person).run();
    
    const { results } = await c.env.DB.prepare('SELECT * FROM suppliers WHERE id = ?').bind(id).all();
    return successResponse(results[0], 'Supplier created successfully');
  } catch (err) {
    console.error('Error creating supplier:', err);
    return errorResponse('Failed to create supplier');
  }
});
