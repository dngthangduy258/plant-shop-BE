/**
 * Reports Routes
 */

import { Hono } from 'hono';
import type { Env } from '../db/helpers';
import { successResponse, errorResponse } from '../db/helpers';

export const reportsRoute = new Hono<{ Bindings: Env }>();

// Dashboard data
reportsRoute.get('/dashboard', async (c) => {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split('T')[0];
  
  try {
    // Today's sales
    const todayResult = await c.env.DB.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total,
        COALESCE(SUM(paid_amount), 0) as paid,
        COALESCE(SUM(debt_amount), 0) as debt,
        COUNT(*) as count
      FROM invoices
      WHERE DATE(invoice_date) = ? AND status != 'cancelled'
    `).bind(today).all();
    
    // Month sales
    const monthResult = await c.env.DB.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total,
        COALESCE(SUM(paid_amount), 0) as paid,
        COALESCE(SUM(debt_amount), 0) as debt,
        COUNT(*) as count
      FROM invoices
      WHERE DATE(invoice_date) >= ? AND status != 'cancelled'
    `).bind(monthStartStr).all();
    
    // Total debt
    const debtResult = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(amount - paid_amount), 0) as total 
      FROM debts WHERE status = 'pending'
    `).all();
    
    // Low stock products
    const lowStockResult = await c.env.DB.prepare(`
      SELECT p.id, p.code, p.name, p.selling_price, 
        COALESCE((SELECT SUM(quantity) FROM batches WHERE product_id = p.id), 0) as stock
      FROM products p
      WHERE p.is_active = 1
      LIMIT 10
    `).all();
    
    const lowStock = lowStockResult.results.filter((p: any) => p.stock <= 10 && p.stock > 0);
    
    // Expiring products (within 30 days)
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const expiringResult = await c.env.DB.prepare(`
      SELECT p.name, b.batch_number, b.expiry_date, b.quantity
      FROM batches b
      JOIN products p ON b.product_id = p.id
      WHERE b.expiry_date IS NOT NULL 
        AND b.quantity > 0
        AND DATE(b.expiry_date) <= ?
      ORDER BY b.expiry_date ASC
      LIMIT 10
    `).bind(thirtyDaysLater.toISOString().split('T')[0]).all();
    
    // Recent invoices
    const recentResult = await c.env.DB.prepare(`
      SELECT i.*, c.name as customer_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.status != 'cancelled'
      ORDER BY i.invoice_date DESC
      LIMIT 10
    `).all();
    
    return successResponse({
      today: todayResult.results[0] || { total: 0, paid: 0, debt: 0, count: 0 },
      month: monthResult.results[0] || { total: 0, paid: 0, debt: 0, count: 0 },
      total_debt: debtResult.results[0]?.total || 0,
      low_stock: lowStock,
      expiring_products: expiringResult.results,
      recent_invoices: recentResult.results
    });
  } catch (err) {
    console.error('Error fetching dashboard:', err);
    return errorResponse('Failed to fetch dashboard data');
  }
});

// Sales report
reportsRoute.get('/sales', async (c) => {
  const { start_date, end_date } = c.req.query();
  
  let query = `
    SELECT 
      DATE(invoice_date) as date,
      COUNT(*) as invoice_count,
      COALESCE(SUM(subtotal), 0) as subtotal,
      COALESCE(SUM(discount_amount), 0) as discount,
      COALESCE(SUM(tax_amount), 0) as tax,
      COALESCE(SUM(total_amount), 0) as total,
      COALESCE(SUM(paid_amount), 0) as paid,
      COALESCE(SUM(debt_amount), 0) as debt
    FROM invoices
    WHERE status != 'cancelled'
  `;
  
  const bindings: any[] = [];
  
  if (start_date) {
    query += ' AND DATE(invoice_date) >= ?';
    bindings.push(start_date);
  }
  if (end_date) {
    query += ' AND DATE(invoice_date) <= ?';
    bindings.push(end_date);
  }
  
  query += ' GROUP BY DATE(invoice_date) ORDER BY date DESC';
  
  try {
    const stmt = c.env.DB.prepare(query);
    const { results } = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();
    return successResponse(results);
  } catch (err) {
    console.error('Error fetching sales report:', err);
    return errorResponse('Failed to fetch sales report');
  }
});

// Tax report
reportsRoute.get('/tax', async (c) => {
  const { start_date, end_date } = c.req.query();
  
  let query = `
    SELECT 
      DATE(invoice_date) as date,
      invoice_number,
      customer_name,
      COALESCE(SUM(subtotal), 0) as subtotal,
      COALESCE(SUM(tax_amount), 0) as tax_amount,
      COALESCE(SUM(total_amount), 0) as total_amount
    FROM invoices
    WHERE tax_amount > 0 AND status != 'cancelled'
  `;
  
  const bindings: any[] = [];
  
  if (start_date) {
    query += ' AND DATE(invoice_date) >= ?';
    bindings.push(start_date);
  }
  if (end_date) {
    query += ' AND DATE(invoice_date) <= ?';
    bindings.push(end_date);
  }
  
  query += ' GROUP BY DATE(invoice_date), invoice_number ORDER BY invoice_date DESC';
  
  try {
    const stmt = c.env.DB.prepare(query);
    const invoices = bindings.length > 0 ? (await stmt.bind(...bindings).all()).results : (await stmt.all()).results;
    
    // Summary
    const summary = {
      total_subtotal: 0,
      total_tax: 0,
      total_amount: 0,
      total_invoices: 0
    };
    
    for (const inv of invoices) {
      summary.total_subtotal += inv.subtotal;
      summary.total_tax += inv.tax_amount;
      summary.total_amount += inv.total_amount;
      summary.total_invoices++;
    }
    
    return successResponse({ invoices, summary });
  } catch (err) {
    console.error('Error fetching tax report:', err);
    return errorResponse('Failed to fetch tax report');
  }
});

// Product sales report
reportsRoute.get('/products', async (c) => {
  const { start_date, end_date } = c.req.query();
  
  let query = `
    SELECT 
      i.product_name,
      i.product_code,
      SUM(i.quantity) as total_quantity,
      AVG(i.unit_price) as avg_price,
      SUM(i.line_total) as total_sales,
      SUM(i.tax_amount) as total_tax
    FROM invoice_items i
    JOIN invoices inv ON i.invoice_id = inv.id
    WHERE inv.status != 'cancelled'
  `;
  
  const bindings: any[] = [];
  
  if (start_date) {
    query += ' AND DATE(inv.invoice_date) >= ?';
    bindings.push(start_date);
  }
  if (end_date) {
    query += ' AND DATE(inv.invoice_date) <= ?';
    bindings.push(end_date);
  }
  
  query += ' GROUP BY i.product_id ORDER BY total_sales DESC';
  
  try {
    const stmt = c.env.DB.prepare(query);
    const { results } = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();
    return successResponse(results);
  } catch (err) {
    console.error('Error fetching product report:', err);
    return errorResponse('Failed to fetch product report');
  }
});

// Profit report
reportsRoute.get('/profit', async (c) => {
  const { start_date, end_date } = c.req.query();
  
  let query = `
    SELECT 
      i.product_name,
      i.product_code,
      SUM(i.quantity) as quantity_sold,
      SUM(i.line_total) as revenue,
      COALESCE((SELECT SUM(b.cost_price * i.quantity) 
        FROM batches b 
        WHERE b.product_id = i.product_id), p.cost_price * SUM(i.quantity)) as estimated_cost,
      SUM(i.line_total) - COALESCE((SELECT SUM(b.cost_price * i.quantity) 
        FROM batches b 
        WHERE b.product_id = i.product_id), p.cost_price * SUM(i.quantity)) as profit
    FROM invoice_items i
    JOIN invoices inv ON i.invoice_id = inv.id
    JOIN products p ON i.product_id = p.id
    WHERE inv.status != 'cancelled'
  `;
  
  const bindings: any[] = [];
  
  if (start_date) {
    query += ' AND DATE(inv.invoice_date) >= ?';
    bindings.push(start_date);
  }
  if (end_date) {
    query += ' AND DATE(inv.invoice_date) <= ?';
    bindings.push(end_date);
  }
  
  query += ' GROUP BY i.product_id ORDER BY profit DESC';
  
  try {
    const stmt = c.env.DB.prepare(query);
    const { results } = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();
    
    const summary = {
      total_revenue: 0,
      total_cost: 0,
      total_profit: 0
    };
    
    for (const p of results) {
      summary.total_revenue += p.revenue;
      summary.total_cost += p.estimated_cost;
      summary.total_profit += p.profit;
    }
    
    return successResponse({ products: results, summary });
  } catch (err) {
    console.error('Error fetching profit report:', err);
    return errorResponse('Failed to fetch profit report');
  }
});
