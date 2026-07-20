/**
 * Debts Routes
 */

import { Hono } from 'hono';
import type { Env } from '../db/helpers';
import { successResponse, errorResponse, generateId } from '../db/helpers';

export const debtsRoute = new Hono<{ Bindings: Env }>();

// Get all debts
debtsRoute.get('/', async (c) => {
  const { status } = c.req.query();
  
  let query = `
    SELECT d.*, c.name as customer_name, c.phone as customer_phone, i.invoice_number
    FROM debts d
    LEFT JOIN customers c ON d.customer_id = c.id
    LEFT JOIN invoices i ON d.invoice_id = i.id
    WHERE 1=1
  `;
  
  const bindings: any[] = [];
  
  if (status) {
    query += ' AND d.status = ?';
    bindings.push(status);
  }
  
  query += ' ORDER BY d.created_at DESC';
  
  try {
    const stmt = c.env.DB.prepare(query);
    const { results } = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();
    
    // Calculate remaining amount
    const debts = results.map((d: any) => ({
      ...d,
      remaining_amount: d.amount - (d.paid_amount || 0)
    }));
    
    return successResponse(debts);
  } catch (err) {
    console.error('Error fetching debts:', err);
    return errorResponse('Failed to fetch debts');
  }
});

// Get debt summary
debtsRoute.get('/summary', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT 
        COALESCE(SUM(amount - paid_amount), 0) as total_debt,
        COUNT(*) as total_debts,
        COUNT(CASE WHEN (amount - paid_amount) > 0 THEN 1 END) as pending_debts
      FROM debts WHERE status = 'pending'
    `).all();
    
    return successResponse(results[0]);
  } catch (err) {
    console.error('Error fetching debt summary:', err);
    return errorResponse('Failed to fetch debt summary');
  }
});

// Pay debt
debtsRoute.post('/:id/pay', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  
  try {
    // Get current debt
    const { results: debts } = await c.env.DB.prepare(`
      SELECT * FROM debts WHERE id = ?
    `).bind(id).all();
    
    if (debts.length === 0) {
      return errorResponse('Debt not found', 404);
    }
    
    const debt = debts[0];
    const newPaidAmount = (debt.paid_amount || 0) + (body.amount || 0);
    const newStatus = newPaidAmount >= debt.amount ? 'paid' : 'pending';
    
    // Update debt
    await c.env.DB.prepare(`
      UPDATE debts 
      SET paid_amount = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(newPaidAmount, newStatus, id).run();
    
    // Record payment
    const paymentId = generateId('payment');
    await c.env.DB.prepare(`
      INSERT INTO debt_payments (id, debt_id, amount, payment_method, note)
      VALUES (?, ?, ?, ?, ?)
    `).bind(paymentId, id, body.amount, body.payment_method || 'cash', body.note || null).run();
    
    // Record cash flow
    await c.env.DB.prepare(`
      INSERT INTO cash_flows (id, type, amount, category, description, payment_method, reference_type, reference_id)
      VALUES (?, 'in', ?, 'thu_no', ?, ?, 'debt', ?)
    `).bind(generateId('cf'), body.amount, `Thu nợ từ khách hàng`, body.payment_method || 'cash', id).run();
    
    return successResponse({
      payment_id: paymentId,
      remaining_debt: debt.amount - newPaidAmount
    }, 'Payment recorded successfully');
  } catch (err) {
    console.error('Error paying debt:', err);
    return errorResponse('Failed to record payment');
  }
});

// Get debt payments history
debtsRoute.get('/:id/payments', async (c) => {
  const { id } = c.req.param();
  
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY payment_date DESC
    `).bind(id).all();
    
    return successResponse(results);
  } catch (err) {
    console.error('Error fetching payments:', err);
    return errorResponse('Failed to fetch payments');
  }
});
