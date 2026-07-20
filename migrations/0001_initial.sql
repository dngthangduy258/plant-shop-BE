-- Plant Shop POS - Initial Schema
-- Version: 1.0.0
-- Description: Database schema for plant protection store POS

-- ============================================
-- CORE TABLES
-- ============================================

-- Store settings
CREATE TABLE IF NOT EXISTS store (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Cửa hàng Thuốc BVTV',
  address TEXT,
  phone TEXT,
  tax_code TEXT,
  logo_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Categories for products
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id TEXT REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  unit TEXT DEFAULT 'Cái',
  cost_price REAL DEFAULT 0,
  selling_price REAL DEFAULT 0,
  tax_rate REAL DEFAULT 10,
  image_url TEXT,
  barcode TEXT,
  is_active INTEGER DEFAULT 1,
  min_stock INTEGER DEFAULT 0,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Batch tracking (with expiry dates)
CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_number TEXT,
  manufacturing_date TEXT,
  expiry_date TEXT,
  quantity REAL DEFAULT 0,
  cost_price REAL,
  supplier_id TEXT REFERENCES suppliers(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  debt_limit REAL DEFAULT 0,
  note TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  contact_person TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- TRANSACTION TABLES
-- ============================================

-- Invoices (Sales)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id TEXT REFERENCES customers(id),
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  subtotal REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  debt_amount REAL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'completed',
  invoice_date TEXT DEFAULT (datetime('now')),
  note TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  product_code TEXT,
  product_name TEXT,
  batch_id TEXT REFERENCES batches(id),
  quantity REAL NOT NULL,
  unit TEXT,
  unit_price REAL NOT NULL,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  line_total REAL NOT NULL
);

-- Debts (Accounts Receivable)
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  invoice_id TEXT REFERENCES invoices(id),
  amount REAL NOT NULL,
  paid_amount REAL DEFAULT 0,
  due_date TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Debt Payments
CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  payment_date TEXT DEFAULT (datetime('now')),
  payment_method TEXT DEFAULT 'cash',
  note TEXT
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  supplier_id TEXT REFERENCES suppliers(id),
  total_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'completed',
  order_date TEXT DEFAULT (datetime('now')),
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Purchase Items
CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  batch_id TEXT REFERENCES batches(id),
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  line_total REAL NOT NULL
);

-- Cash Flows (Income/Expense tracking)
CREATE TABLE IF NOT EXISTS cash_flows (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT,
  description TEXT,
  payment_method TEXT DEFAULT 'cash',
  reference_type TEXT,
  reference_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_batches_product ON batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_debts_customer ON debts(customer_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default store
INSERT OR IGNORE INTO store (id, name, address, phone, tax_code)
VALUES ('default-store', 'Cửa hàng Thuốc BVTV Demo', 'Địa chỉ cửa hàng', '0123456789', 'MST001');

-- Insert default categories
INSERT OR IGNORE INTO categories (id, name, sort_order) VALUES
  ('cat-1', 'Thuốc trừ sâu', 1),
  ('cat-2', 'Thuốc trừ bệnh', 2),
  ('cat-3', 'Thuốc trừ cỏ', 3),
  ('cat-4', 'Phân bón', 4),
  ('cat-5', 'Thuốc kích thích', 5),
  ('cat-6', 'Vật tư nông nghiệp', 6);
