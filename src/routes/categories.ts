/**
 * Categories Routes
 */

import { Hono } from 'hono';
import type { Env } from '../db/helpers';
import { successResponse, errorResponse, generateId } from '../db/helpers';

export const categoriesRoute = new Hono<{ Bindings: Env }>();

// Get all categories
categoriesRoute.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM categories 
      WHERE is_active = 1 
      ORDER BY sort_order, name
    `).all();
    
    return successResponse(results);
  } catch (err) {
    console.error('Error fetching categories:', err);
    return errorResponse('Failed to fetch categories');
  }
});

// Get single category
categoriesRoute.get('/:id', async (c) => {
  const { id } = c.req.param();
  
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM categories WHERE id = ?
    `).bind(id).all();
    
    if (results.length === 0) {
      return errorResponse('Category not found', 404);
    }
    
    return successResponse(results[0]);
  } catch (err) {
    console.error('Error fetching category:', err);
    return errorResponse('Failed to fetch category');
  }
});

// Create category
categoriesRoute.post('/', async (c) => {
  const body = await c.req.json();
  
  if (!body.name) {
    return errorResponse('Name is required', 400);
  }
  
  const id = body.id || generateId('cat');
  
  try {
    await c.env.DB.prepare(`
      INSERT INTO categories (id, name, description, parent_id, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, body.name, body.description || null, body.parent_id || null, body.sort_order || 0).run();
    
    const { results } = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).all();
    return successResponse(results[0], 'Category created successfully');
  } catch (err) {
    console.error('Error creating category:', err);
    return errorResponse('Failed to create category');
  }
});

// Update category
categoriesRoute.put('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  
  try {
    await c.env.DB.prepare(`
      UPDATE categories 
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          parent_id = COALESCE(?, parent_id),
          sort_order = COALESCE(?, sort_order)
      WHERE id = ?
    `).bind(body.name, body.description, body.parent_id, body.sort_order, id).run();
    
    const { results } = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).all();
    return successResponse(results[0], 'Category updated successfully');
  } catch (err) {
    console.error('Error updating category:', err);
    return errorResponse('Failed to update category');
  }
});

// Delete category (soft delete)
categoriesRoute.delete('/:id', async (c) => {
  const { id } = c.req.param();
  
  try {
    await c.env.DB.prepare(`
      UPDATE categories SET is_active = 0 WHERE id = ?
    `).bind(id).run();
    
    return successResponse(null, 'Category deleted successfully');
  } catch (err) {
    console.error('Error deleting category:', err);
    return errorResponse('Failed to delete category');
  }
});
