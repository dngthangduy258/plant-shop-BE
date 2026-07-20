/**
 * Customers Routes
 */

import { Hono } from 'hono';
import type { Env } from '../db/helpers';
import { successResponse, errorResponse, generateId } from '../db/helpers';

export const customersRoute = new Hono<{ Bindings: Env }>();

// Get all customers
customersRoute.get('/', async (c) => {
  const { search } = c.req.query();
  
  let query = `
    SELECT * FROM customers 
    WHERE is_active = 1
  `;
  
  const bindings: any[] = [];
  
  if (search) {
    query += ' AND (name LIKE ? OR phone LIKE ? OR code LIKE ?)';
    bindings.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  query += ' ORDER BY name';
  
  try {
    const stmt = c.env.DB.prepare(query);
    const { results } = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();
    return successResponse(results);
  } catch (err) {
    console.error('Error fetching customers:', err);
    return errorResponse('Failed to fetch customers');
  }
});

// Get single customer with debts and invoices
customersRoute.get('/:id', async (c) => {
  const { id } = c.req.param();
  
  try {
    const { results: customers } = await c.env.DB.prepare(`
      SELECT * FROM customers WHERE id = ?
    `).bind(id).all();
    
    if (customers.length === 0) {
      return errorResponse('Customer not found', 404);
    }
    
    const customer = customers[0];
    
    // Get total debt
    const { results: debts } = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(amount - paid_amount), 0) as total_debt
      FROM debts 
      WHERE customer_id = ? AND status = 'pending'
    `).bind(id).all();
    
    customer.total_debt = debts[0]?.total_debt || 0;
    
    // Get recent invoices
    const { results: invoices } = await c.env.DB.prepare(`
      SELECT * FROM invoices 
      WHERE customer_id = ? 
      ORDER BY invoice_date DESC 
      LIMIT 10
    `).bind(id).all();
    
    customer.recent_invoices = invoices;
    
    return successResponse(customer);
  } catch (err) {
    console.error('Error fetching customer:', err);
    return errorResponse('Failed to fetch customer');
  }
});

// Create customer
customersRoute.post('/', async (c) => {
  const body = await c.req.json();
  
  if (!body.name) {
    return errorResponse('Name is required', 400);
  }
  
  // Check for duplicate phone number
  if (body.phone) {
    const { results: existing } = await c.env.DB.prepare(
      'SELECT id FROM customers WHERE phone = ? AND is_active = 1'
    ).bind(body.phone).all();
    
    if (existing.length > 0) {
      return errorResponse('Số điện thoại đã được sử dụng bởi khách hàng khác', 400);
    }
  }
  
  const id = body.id || generateId('cust');
  const code = body.code || `KH${Date.now()}`;
  
  try {
    await c.env.DB.prepare(`
      INSERT INTO customers (id, code, name, phone, email, address, debt_limit, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      code,
      body.name,
      body.phone || null,
      body.email || null,
      body.address || null,
      body.debt_limit || 0,
      body.note || null
    ).run();
    
    const { results } = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(id).all();
    return successResponse(results[0], 'Customer created successfully');
  } catch (err) {
    console.error('Error creating customer:', err);
    return errorResponse('Failed to create customer');
  }
});

// Update customer
customersRoute.put('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  
  // Check for duplicate phone number (excluding current customer)
  if (body.phone) {
    const { results: existing } = await c.env.DB.prepare(
      'SELECT id FROM customers WHERE phone = ? AND id != ? AND is_active = 1'
    ).bind(body.phone, id).all();
    
    if (existing.length > 0) {
      return errorResponse('Số điện thoại đã được sử dụng bởi khách hàng khác', 400);
    }
  }
  
  try {
    await c.env.DB.prepare(`
      UPDATE customers SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        debt_limit = COALESCE(?, debt_limit),
        note = COALESCE(?, note),
        is_active = COALESCE(?, is_active),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      body.name,
      body.phone,
      body.email,
      body.address,
      body.debt_limit,
      body.note,
      body.is_active,
      id
    ).run();
    
    const { results } = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(id).all();
    return successResponse(results[0], 'Customer updated successfully');
  } catch (err) {
    console.error('Error updating customer:', err);
    return errorResponse('Failed to update customer');
  }
});

// Delete customer (soft delete)
customersRoute.delete('/:id', async (c) => {
  const { id } = c.req.param();
  
  try {
    await c.env.DB.prepare(`
      UPDATE customers SET is_active = 0, updated_at = datetime('now') WHERE id = ?
    `).bind(id).run();
    
    return successResponse(null, 'Customer deleted successfully');
  } catch (err) {
    console.error('Error deleting customer:', err);
    return errorResponse('Failed to delete customer');
  }
});
