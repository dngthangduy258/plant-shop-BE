/**
 * Seed Data Routes
 * Create sample data for testing
 */

import { Hono } from 'hono';
import { generateId, generateInvoiceNumber } from '../db/helpers';
import type { Env } from '../db/helpers';

export const seedRoute = new Hono<{ Bindings: Env }>();

// POST /api/seed - Create sample data
seedRoute.post('/', async (c) => {
  try {
    // Create tables if not exist
    await c.env.DB
      .prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          store_name TEXT,
          phone TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `)
      .run();

    await c.env.DB
      .prepare(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          expires_at TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `)
      .run();

    // Check if data already exists
    const existingProducts = await c.env.DB
      .prepare('SELECT COUNT(*) as count FROM products')
      .first();

    if (existingProducts && existingProducts.count > 0) {
      return c.json({
        success: true,
        message: 'Data already exists',
        data: { products_count: existingProducts.count }
      });
    }

    // Create sample categories
    const categories = [
      { id: generateId('cat'), name: 'Cây cảnh', description: 'Cây trồng trong nhà và ngoài trời' },
      { id: generateId('cat'), name: 'Phân bón', description: 'Phân bón các loại' },
      { id: generateId('cat'), name: 'Thuốc trừ sâu', description: 'Thuốc bảo vệ thực vật' },
      { id: generateId('cat'), name: 'Dụng cụ', description: 'Dụng cụ chăm sóc cây' },
      { id: generateId('cat'), name: 'Chậu & Đất', description: 'Chậu trồng và đất субстрат' },
    ];

    for (const cat of categories) {
      await c.env.DB
        .prepare(`
          INSERT INTO categories (id, name, description, created_at)
          VALUES (?, ?, ?, datetime('now'))
        `)
        .bind(cat.id, cat.name, cat.description)
        .run();
    }

    // Create sample products
    const products = [
      // Cây cảnh
      { name: 'Cây lưỡi hổ', code: 'CC001', category: 0, cost: 45000, price: 85000, stock: 50 },
      { name: 'Cây trầu bà', code: 'CC002', category: 0, cost: 35000, price: 65000, stock: 45 },
      { name: 'Sen đá', code: 'CC003', category: 0, cost: 25000, price: 45000, stock: 60 },
      { name: 'Xương rồng', code: 'CC004', category: 0, cost: 30000, price: 55000, stock: 40 },
      { name: 'Cây phú quý', code: 'CC005', category: 0, cost: 55000, price: 95000, stock: 35 },
      { name: 'Cây đuôi công', code: 'CC006', category: 0, cost: 40000, price: 75000, stock: 30 },
      { name: 'Cây dứa', code: 'CC007', category: 0, cost: 60000, price: 110000, stock: 25 },
      { name: 'Cây thiết mộc hoa', code: 'CC008', category: 0, cost: 80000, price: 150000, stock: 20 },
      { name: 'Cây kim ngân', code: 'CC009', category: 0, cost: 70000, price: 130000, stock: 28 },
      { name: 'Cây huyết dụ', code: 'CC010', category: 0, cost: 50000, price: 90000, stock: 32 },
      
      // Phân bón
      { name: 'Phân NPK 16-16-8', code: 'PB001', category: 1, cost: 35000, price: 55000, stock: 100 },
      { name: 'Phân Urê', code: 'PB002', category: 1, cost: 25000, price: 40000, stock: 80 },
      { name: 'Phân vi sinh', code: 'PB003', category: 1, cost: 45000, price: 70000, stock: 60 },
      { name: 'Phân hữu cơ', code: 'PB004', category: 1, cost: 30000, price: 50000, stock: 90 },
      { name: 'Phân DAP', code: 'PB005', category: 1, cost: 40000, price: 65000, stock: 70 },
      
      // Thuốc trừ sâu
      { name: 'Thuốc trừ sâu xanh', code: 'TS001', category: 2, cost: 55000, price: 85000, stock: 45 },
      { name: 'Thuốc diệt côn trùng', code: 'TS002', category: 2, cost: 65000, price: 95000, stock: 40 },
      { name: 'Thuốc phòng nấm', code: 'TS003', category: 2, cost: 48000, price: 75000, stock: 55 },
      { name: 'Thuốc trừ bọ phấn', code: 'TS004', category: 2, cost: 52000, price: 80000, stock: 38 },
      
      // Dụng cụ
      { name: 'Kéo cắt cành', code: 'DC001', category: 3, cost: 85000, price: 150000, stock: 20 },
      { name: 'Bình xịt nước', code: 'DC002', category: 3, cost: 55000, price: 95000, stock: 35 },
      { name: 'Găng tay làm vườn', code: 'DC003', category: 3, cost: 25000, price: 45000, stock: 50 },
      { name: 'Cuốc xẻng mini', code: 'DC004', category: 3, cost: 65000, price: 110000, stock: 25 },
      
      // Chậu & Đất
      { name: 'Chậu sứ trắng 20cm', code: 'CD001', category: 4, cost: 35000, price: 65000, stock: 60 },
      { name: 'Chậu nhựa đen 15cm', code: 'CD002', category: 4, cost: 15000, price: 30000, stock: 100 },
      { name: 'Đất trồng đa năng', code: 'CD003', category: 4, cost: 25000, price: 45000, stock: 80 },
      { name: 'Xơ dừa', code: 'CD004', category: 4, cost: 18000, price: 35000, stock: 70 },
      { name: 'Sỏi trắng trang trí', code: 'CD005', category: 4, cost: 22000, price: 40000, stock: 55 },
    ];

    for (const p of products) {
      const product_id = generateId('prod');
      const batch_id = generateId('batch');

      // Create product
      await c.env.DB
        .prepare(`
          INSERT INTO products (id, code, name, category_id, cost_price, selling_price, unit, tax_rate, image_url, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'cái', 10, '', datetime('now'))
        `)
        .bind(product_id, p.code, p.name, categories[p.category].id, p.cost, p.price)
        .run();

      // Create initial batch with stock
      await c.env.DB
        .prepare(`
          INSERT INTO product_batches (id, product_id, batch_code, quantity, cost_price, expiry_date, created_at)
          VALUES (?, ?, ?, ?, ?, datetime('now', '+30 days'), datetime('now'))
        `)
        .bind(batch_id, product_id, `LOT-${p.code}`, p.stock, p.cost)
        .run();
    }

    // Create sample customers
    const customers = [
      { name: 'Nguyễn Văn A', phone: '0909123456', address: '123 Nguyễn Trãi, Q1, HCM' },
      { name: 'Trần Thị B', phone: '0912345678', address: '456 Lê Lợi, Q3, HCM' },
      { name: 'Lê Văn C', phone: '0932123456', address: '789 Pasteur, Q1, HCM' },
      { name: 'Phạm Thị D', phone: '0944567890', address: '321 Điện Biên Phủ, Q10, HCM' },
      { name: 'Hoàng Văn E', phone: '0955567890', address: '654 Võ Văn Tần, Q3, HCM' },
      { name: 'Ngô Thị F', phone: '0966789012', address: '987 Trần Hưng Đạo, Q5, HCM' },
      { name: 'Vũ Văn G', phone: '0977890123', address: '147 Nguyễn Thị Minh Khai, Q1, HCM' },
      { name: 'Đặng Thị H', phone: '0988901234', address: '258 Cách Mạng Tháng 8, Q10, HCM' },
      { name: 'Bùi Văn I', phone: '0399012345', address: '369 Đại lộ Thăng Long, Hà Nội' },
      { name: 'Đỗ Thị K', phone: '0389123456', address: '741 Láng Hạ, Hà Nội' },
    ];

    for (const cust of customers) {
      await c.env.DB
        .prepare(`
          INSERT INTO customers (id, name, phone, address, total_debt, created_at)
          VALUES (?, ?, ?, ?, 0, datetime('now'))
        `)
        .bind(generateId('cust'), cust.name, cust.phone, cust.address)
        .run();
    }

    // Create sample invoices (last 7 days)
    const sampleCustomers = await c.env.DB
      .prepare('SELECT id FROM customers LIMIT 5')
      .all();

    for (let i = 0; i < 10; i++) {
      const invoiceNumber = generateInvoiceNumber();
      const invoiceDate = new Date();
      invoiceDate.setDate(invoiceDate.getDate() - Math.floor(Math.random() * 7));
      const subtotal = 150000 + Math.floor(Math.random() * 500000);
      const tax = Math.floor(subtotal * 0.1);
      const total = subtotal + tax;
      const paid = total - (Math.random() > 0.7 ? Math.floor(total * 0.3) : 0);
      const customerId = sampleCustomers.results && sampleCustomers.results[i % 5]
        ? sampleCustomers.results[i % 5].id
        : null;

      await c.env.DB
        .prepare(`
          INSERT INTO invoices (id, invoice_number, customer_id, customer_name, subtotal, tax_amount, discount_amount, total_amount, paid_amount, debt_amount, payment_method, status, invoice_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'cash', 'completed', datetime(?), datetime(?))
        `)
        .bind(
          generateId('inv'),
          invoiceNumber,
          customerId,
          customerId ? `Khách hàng ${i + 1}` : 'Khách lẻ',
          subtotal,
          tax,
          total,
          paid,
          total - paid,
          invoiceDate.toISOString()
        )
        .run();
    }

    return c.json({
      success: true,
      message: 'Sample data created successfully',
      data: {
        categories: categories.length,
        products: products.length,
        customers: customers.length,
        invoices: 10
      }
    });
  } catch (error) {
    console.error('Seed error:', error);
    return c.json({ success: false, error: 'Failed to create sample data' }, 500);
  }
});

// GET /api/seed - Check seed status
seedRoute.get('/', async (c) => {
  const products = await c.env.DB.prepare('SELECT COUNT(*) as count FROM products').first();
  const categories = await c.env.DB.prepare('SELECT COUNT(*) as count FROM categories').first();
  const customers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM customers').first();
  const invoices = await c.env.DB.prepare('SELECT COUNT(*) as count FROM invoices').first();

  return c.json({
    success: true,
    data: {
      is_seeded: products && products.count > 0,
      counts: {
        categories: categories?.count || 0,
        products: products?.count || 0,
        customers: customers?.count || 0,
        invoices: invoices?.count || 0
      }
    }
  });
});
