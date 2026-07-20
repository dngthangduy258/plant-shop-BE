/**
 * Products Routes
 */

import { Hono } from 'hono';
import type { Env } from '../db/helpers';
import { successResponse, errorResponse, generateId } from '../db/helpers';

export const productsRoute = new Hono<{ Bindings: Env }>();

// Get all products
productsRoute.get('/', async (c) => {
  const { search, category_id, low_stock } = c.req.query();
  
  let query = `
    SELECT p.*, c.name as category_name,
      COALESCE((SELECT SUM(quantity) FROM batches WHERE product_id = p.id AND quantity > 0), 0) as total_stock
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
  `;
  
  const bindings: any[] = [];
  
  if (search) {
    query += ' AND (p.name LIKE ? OR p.code LIKE ? OR p.barcode LIKE ?)';
    bindings.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  if (category_id) {
    query += ' AND p.category_id = ?';
    bindings.push(category_id);
  }
  
  query += ' ORDER BY p.name';
  
  try {
    const stmt = c.env.DB.prepare(query);
    const { results } = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();
    
    // Filter low stock in memory for D1 compatibility
    let products = results;
    if (low_stock === 'true') {
      products = products.filter((p: any) => p.total_stock <= 10);
    }
    
    return successResponse(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    return errorResponse('Failed to fetch products');
  }
});

// Get single product with batches
productsRoute.get('/:id', async (c) => {
  const { id } = c.req.param();
  
  try {
    const { results: products } = await c.env.DB.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).bind(id).all();
    
    if (products.length === 0) {
      return errorResponse('Product not found', 404);
    }
    
    const product = products[0];
    
    // Get batches
    const { results: batches } = await c.env.DB.prepare(`
      SELECT * FROM batches 
      WHERE product_id = ? AND quantity > 0 
      ORDER BY expiry_date
    `).bind(id).all();
    
    return successResponse({ ...product, batches });
  } catch (err) {
    console.error('Error fetching product:', err);
    return errorResponse('Failed to fetch product');
  }
});

// Create product
productsRoute.post('/', async (c) => {
  const body = await c.req.json();
  
  if (!body.name) {
    return errorResponse('Name is required', 400);
  }
  
  const id = body.id || generateId('prod');
  const code = body.code || `SP${Date.now()}`;
  
  try {
    await c.env.DB.prepare(`
      INSERT INTO products (id, code, name, category_id, unit, cost_price, selling_price, tax_rate, image_url, barcode, min_stock, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      code,
      body.name,
      body.category_id || null,
      body.unit || 'Cái',
      body.cost_price || 0,
      body.selling_price || 0,
      body.tax_rate || 10,
      body.image_url || null,
      body.barcode || null,
      body.min_stock || 0,
      body.description || null
    ).run();
    
    const { results } = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).all();
    return successResponse(results[0], 'Product created successfully');
  } catch (err) {
    console.error('Error creating product:', err);
    return errorResponse('Failed to create product');
  }
});

// Update product
productsRoute.put('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  
  try {
    await c.env.DB.prepare(`
      UPDATE products SET
        code = COALESCE(?, code),
        name = COALESCE(?, name),
        category_id = COALESCE(?, category_id),
        unit = COALESCE(?, unit),
        cost_price = COALESCE(?, cost_price),
        selling_price = COALESCE(?, selling_price),
        tax_rate = COALESCE(?, tax_rate),
        image_url = COALESCE(?, image_url),
        barcode = COALESCE(?, barcode),
        min_stock = COALESCE(?, min_stock),
        description = COALESCE(?, description),
        is_active = COALESCE(?, is_active),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      body.code,
      body.name,
      body.category_id,
      body.unit,
      body.cost_price,
      body.selling_price,
      body.tax_rate,
      body.image_url,
      body.barcode,
      body.min_stock,
      body.description,
      body.is_active,
      id
    ).run();
    
    const { results } = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).all();
    return successResponse(results[0], 'Product updated successfully');
  } catch (err) {
    console.error('Error updating product:', err);
    return errorResponse('Failed to update product');
  }
});

// Delete product (soft delete)
productsRoute.delete('/:id', async (c) => {
  const { id } = c.req.param();
  
  try {
    await c.env.DB.prepare(`
      UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?
    `).bind(id).run();
    
    return successResponse(null, 'Product deleted successfully');
  } catch (err) {
    console.error('Error deleting product:', err);
    return errorResponse('Failed to delete product');
  }
});

// Get product batches
productsRoute.get('/:id/batches', async (c) => {
  const { id } = c.req.param();
  
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM batches 
      WHERE product_id = ? 
      ORDER BY expiry_date
    `).bind(id).all();
    
    return successResponse(results);
  } catch (err) {
    console.error('Error fetching batches:', err);
    return errorResponse('Failed to fetch batches');
  }
});

// Add batch to product
productsRoute.post('/:id/batches', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  
  const batchId = body.id || generateId('batch');
  
  try {
    await c.env.DB.prepare(`
      INSERT INTO batches (id, product_id, batch_number, manufacturing_date, expiry_date, quantity, cost_price, supplier_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      batchId,
      id,
      body.batch_number || null,
      body.manufacturing_date || null,
      body.expiry_date || null,
      body.quantity || 0,
      body.cost_price || null,
      body.supplier_id || null
    ).run();
    
    const { results } = await c.env.DB.prepare('SELECT * FROM batches WHERE id = ?').bind(batchId).all();
    return successResponse(results[0], 'Batch added successfully');
  } catch (err) {
    console.error('Error adding batch:', err);
    return errorResponse('Failed to add batch');
  }
});

// Update batch
productsRoute.put('/:productId/batches/:batchId', async (c) => {
  const { productId, batchId } = c.req.param();
  const body = await c.req.json();
  
  try {
    await c.env.DB.prepare(`
      UPDATE batches SET
        batch_number = COALESCE(?, batch_number),
        manufacturing_date = COALESCE(?, manufacturing_date),
        expiry_date = COALESCE(?, expiry_date),
        quantity = COALESCE(?, quantity),
        cost_price = COALESCE(?, cost_price),
        updated_at = datetime('now')
      WHERE id = ? AND product_id = ?
    `).bind(
      body.batch_number,
      body.manufacturing_date,
      body.expiry_date,
      body.quantity,
      body.cost_price,
      batchId,
      productId
    ).run();
    
    const { results } = await c.env.DB.prepare('SELECT * FROM batches WHERE id = ?').bind(batchId).all();
    return successResponse(results[0], 'Batch updated successfully');
  } catch (err) {
    console.error('Error updating batch:', err);
    return errorResponse('Failed to update batch');
  }
});
