/**
 * Invoices Routes
 */

import { Hono } from 'hono';
import type { Env } from '../db/helpers';
import { successResponse, errorResponse, generateId, generateInvoiceNumber, calculateInvoiceTotals } from '../db/helpers';

export const invoicesRoute = new Hono<{ Bindings: Env }>();

// Get all invoices
invoicesRoute.get('/', async (c) => {
  const { start_date, end_date, customer_id, status } = c.req.query();
  
  let query = `
    SELECT i.*, c.name as customer_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    WHERE 1=1
  `;
  
  const bindings: any[] = [];
  
  if (start_date) {
    query += ' AND DATE(i.invoice_date) >= ?';
    bindings.push(start_date);
  }
  if (end_date) {
    query += ' AND DATE(i.invoice_date) <= ?';
    bindings.push(end_date);
  }
  if (customer_id) {
    query += ' AND i.customer_id = ?';
    bindings.push(customer_id);
  }
  if (status) {
    query += ' AND i.status = ?';
    bindings.push(status);
  }
  
  query += ' ORDER BY i.invoice_date DESC';
  
  try {
    const stmt = c.env.DB.prepare(query);
    const { results } = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();
    return successResponse(results);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    return errorResponse('Failed to fetch invoices');
  }
});

// Get single invoice with items
invoicesRoute.get('/:id', async (c) => {
  const { id } = c.req.param();
  
  try {
    const { results: invoices } = await c.env.DB.prepare(`
      SELECT i.*, c.name as customer_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `).bind(id).all();
    
    if (invoices.length === 0) {
      return errorResponse('Invoice not found', 404);
    }
    
    const invoice = invoices[0];
    
    // Get invoice items
    const { results: items } = await c.env.DB.prepare(`
      SELECT * FROM invoice_items WHERE invoice_id = ?
    `).bind(id).all();
    
    invoice.items = items;
    
    return successResponse(invoice);
  } catch (err) {
    console.error('Error fetching invoice:', err);
    return errorResponse('Failed to fetch invoice');
  }
});

// Create invoice
invoicesRoute.post('/', async (c) => {
  const body = await c.req.json();
  
  const id = body.id || generateId('inv');
  const invoiceNumber = generateInvoiceNumber();
  
  // Calculate totals
  const { subtotal, totalTax } = calculateInvoiceTotals(body.items || []);
  const totalAmount = subtotal + totalTax - (body.discount_amount || 0);
  const debtAmount = totalAmount - (body.paid_amount || 0);
  
  try {
    // Create invoice
    await c.env.DB.prepare(`
      INSERT INTO invoices (
        id, invoice_number, customer_id, customer_name, customer_phone, customer_address,
        subtotal, discount_amount, tax_amount, total_amount, paid_amount, debt_amount,
        payment_method, status, note, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      invoiceNumber,
      body.customer_id || null,
      body.customer_name || 'Khách lẻ',
      body.customer_phone || null,
      body.customer_address || null,
      subtotal,
      body.discount_amount || 0,
      totalTax,
      totalAmount,
      body.paid_amount || 0,
      debtAmount,
      body.payment_method || 'cash',
      debtAmount > 0 ? 'debt' : 'completed',
      body.note || null,
      body.created_by || null
    ).run();
    
    // Create invoice items and update batch quantities
    for (const item of body.items || []) {
      const itemId = generateId('item');
      const itemTotal = (item.quantity || 0) * (item.unit_price || 0) - (item.discount_amount || 0);
      const itemTax = itemTotal * ((item.tax_rate || 10) / 100);
      
      await c.env.DB.prepare(`
        INSERT INTO invoice_items (
          id, invoice_id, product_id, product_code, product_name, batch_id,
          quantity, unit, unit_price, tax_rate, tax_amount, discount_amount, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        itemId,
        id,
        item.product_id || null,
        item.product_code || null,
        item.product_name,
        item.batch_id || null,
        item.quantity,
        item.unit || 'Cái',
        item.unit_price,
        item.tax_rate || 10,
        itemTax,
        item.discount_amount || 0,
        itemTotal + itemTax
      ).run();
      
      // Update batch quantity
      if (item.batch_id) {
        await c.env.DB.prepare(`
          UPDATE batches SET quantity = quantity - ? WHERE id = ?
        `).bind(item.quantity, item.batch_id).run();
      }
    }
    
    // Create debt record if there's outstanding amount
    if (debtAmount > 0 && body.customer_id) {
      const debtId = generateId('debt');
      await c.env.DB.prepare(`
        INSERT INTO debts (id, customer_id, invoice_id, amount, paid_amount, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).bind(debtId, body.customer_id, id, totalAmount, body.paid_amount || 0).run();
      
      // Record cash flow
      await c.env.DB.prepare(`
        INSERT INTO cash_flows (id, type, amount, category, description, reference_type, reference_id)
        VALUES (?, 'out', ?, 'cong_no', ?, 'invoice', ?)
      `).bind(generateId('cf'), debtAmount, `Công nợ từ hóa đơn ${invoiceNumber}`, id).run();
    }
    
    // Record cash inflow if paid
    if (body.paid_amount > 0) {
      await c.env.DB.prepare(`
        INSERT INTO cash_flows (id, type, amount, category, description, payment_method, reference_type, reference_id)
        VALUES (?, 'in', ?, 'ban_hang', ?, ?, 'invoice', ?)
      `).bind(generateId('cf'), body.paid_amount, `Thanh toán hóa đơn ${invoiceNumber}`, body.payment_method || 'cash', id).run();
    }
    
    return successResponse({
      id,
      invoice_number: invoiceNumber,
      total_amount: totalAmount,
      debt_amount: debtAmount
    }, 'Invoice created successfully');
  } catch (err) {
    console.error('Error creating invoice:', err);
    return errorResponse('Failed to create invoice');
  }
});

// Delete invoice (cancel)
invoicesRoute.delete('/:id', async (c) => {
  const { id } = c.req.param();
  
  try {
    // Get invoice items to restore batch quantities
    const { results: items } = await c.env.DB.prepare(`
      SELECT * FROM invoice_items WHERE invoice_id = ?
    `).bind(id).all();
    
    // Restore batch quantities
    for (const item of items) {
      if (item.batch_id) {
        await c.env.DB.prepare(`
          UPDATE batches SET quantity = quantity + ? WHERE id = ?
        `).bind(item.quantity, item.batch_id).run();
      }
    }
    
    // Delete invoice (cascade will delete items)
    await c.env.DB.prepare(`
      UPDATE invoices SET status = 'cancelled' WHERE id = ?
    `).bind(id).run();
    
    return successResponse(null, 'Invoice cancelled successfully');
  } catch (err) {
    console.error('Error cancelling invoice:', err);
    return errorResponse('Failed to cancel invoice');
  }
});
