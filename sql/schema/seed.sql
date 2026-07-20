-- Seed Data for Plant Shop POS
-- Run: wrangler d1 execute plant-shop-db --remote --file=./sql/schema/seed.sql

-- Insert Categories
INSERT OR IGNORE INTO categories (id, name, description, sort_order) VALUES
  ('cat-1', 'Thuốc trừ sâu', 'Các loại thuốc diệt côn trùng, sâu bọ', 1),
  ('cat-2', 'Thuốc trừ bệnh', 'Thuốc phòng và trị bệnh cho cây', 2),
  ('cat-3', 'Thuốc trừ cỏ', 'Thuốc diệt cỏ dại', 3),
  ('cat-4', 'Phân bón', 'Phân bón NPK, hữu cơ, vi sinh', 4),
  ('cat-5', 'Thuốc kích thích', 'Thuốc kích rễ, kích hoa, kích quả', 5),
  ('cat-6', 'Vật tư nông nghiệp', 'Dụng cụ, vật tư phục vụ trồng trọt', 6),
  ('cat-7', 'Cây giống', 'Giống cây trồng các loại', 7),
  ('cat-8', 'Cây cảnh', 'Cây cảnh trang trí', 8);

-- Insert Products
INSERT OR IGNORE INTO products (id, code, name, category_id, unit, cost_price, selling_price, tax_rate, min_stock, description) VALUES
  ('prod-001', 'TS001', 'Thuốc trừ sâu Lufenuron 5%EC', 'cat-1', 'Chai 100ml', 35000, 65000, 10, 20, 'Thuốc trừ sâu phổ rộng, diệt trừ hiệu quả nhiều loại côn trùng'),
  ('prod-002', 'TS002', 'Thuốc trừ sâu Emamectin 5%WG', 'cat-1', 'Gói 10g', 25000, 45000, 10, 30, 'Thuốc trừ sâu sinh học, an toàn cho cây trồng'),
  ('prod-003', 'TS003', 'Thuốc trừ sâu Chlorpyrifos 480EC', 'cat-1', 'Chai 250ml', 55000, 95000, 10, 15, 'Thuốc trừ sâu mạnh, diệt sâu non hiệu quả'),
  ('prod-004', 'TB001', 'Thuốc trừ bệnh Mancozeb 80%WP', 'cat-2', 'Gói 100g', 30000, 55000, 10, 25, 'Thuốc phòng trị nấm bệnh, lem lá, lem cành'),
  ('prod-005', 'TB002', 'Thuốc trừ bệnh Copper Hydroxide', 'cat-2', 'Gói 50g', 20000, 38000, 10, 30, 'Thuốc trừ bệnh gốc đồng, phòng sương mai'),
  ('prod-006', 'TC001', 'Thuốc trừ cỏ Glyphosate 480SC', 'cat-3', 'Chai 500ml', 45000, 75000, 10, 20, 'Thuốc diệt cỏ toàn tính, hiệu quả cao'),
  ('prod-007', 'TC002', 'Thuốc trừ cỏ Butachlor 50%EC', 'cat-3', 'Chai 250ml', 35000, 60000, 10, 20, 'Thuốc diệt cỏ cho lúa, ngô'),
  ('prod-008', 'PB001', 'Phân NPK 20-20-15+TE', 'cat-4', 'Bao 25kg', 350000, 480000, 0, 10, 'Phân bón tổng hợp, cân đối dinh dưỡng'),
  ('prod-009', 'PB002', 'Phân NPK 16-16-8', 'cat-4', 'Bao 25kg', 320000, 450000, 0, 10, 'Phân bón cân đối cho cây trồng'),
  ('prod-010', 'PB003', 'Phân hữu cơ vi sinh', 'cat-4', 'Bao 25kg', 180000, 280000, 0, 15, 'Phân hữu cơ cải tạo đất, an toàn'),
  ('prod-011', 'PB004', 'Phân urê', 'cat-4', 'Bao 50kg', 450000, 580000, 0, 10, 'Phân đạm urê, kích thích cây phát triển'),
  ('prod-012', 'KT001', 'Vitamin B1', 'cat-5', 'Chai 100ml', 25000, 45000, 10, 25, 'Thuốc kích rễ, giúp cây hồi phục nhanh'),
  ('prod-013', 'KT002', 'NAA kích rễ', 'cat-5', 'Gói 10g', 30000, 55000, 10, 20, 'Hormone kích rễ, giâm cành hiệu quả'),
  ('prod-014', 'VT001', 'Bình xịt nước 5L', 'cat-6', 'Cái', 85000, 150000, 10, 10, 'Bình xịt phun sương, tưới cây'),
  ('prod-015', 'VT002', 'Găng tay làm vườn', 'cat-6', 'Đôi', 25000, 45000, 10, 30, 'Găng tay bảo hộ khi làm vườn'),
  ('prod-016', 'VT003', 'Kéo cắt cành', 'cat-6', 'Cái', 75000, 135000, 10, 15, 'Kéo cắt tỉa cành, chuyên dụng'),
  ('prod-017', 'CG001', 'Giống rau muống', 'cat-7', 'Gói', 8000, 15000, 0, 50, 'Giống rau muống chất lượng cao'),
  ('prod-018', 'CG002', 'Giống cải ngọt', 'cat-7', 'Gói', 10000, 18000, 0, 50, 'Giống cải ngọt F1'),
  ('prod-019', 'CC001', 'Cây lưỡi hổ', 'cat-8', 'Chậu', 45000, 89000, 10, 10, 'Cây cảnh phong thủy, dễ chăm sóc'),
  ('prod-020', 'CC002', 'Cây trầu bà', 'cat-8', 'Chậu', 35000, 69000, 10, 15, 'Cây cảnh thanh lọc không khí');

-- Insert Customers
INSERT OR IGNORE INTO customers (id, code, name, phone, email, address, debt_limit) VALUES
  ('cust-001', 'KH001', 'Nguyễn Văn A', '0909123456', 'vana@gmail.com', '123 Lê Lợi, Q.1, TP.HCM', 1000000),
  ('cust-002', 'KH002', 'Trần Thị B', '0912345678', 'thibc@gmail.com', '456 Điện Biên Phủ, Q.3, TP.HCM', 500000),
  ('cust-003', 'KH003', 'Lê Minh C', '0934567890', 'minhc@yahoo.com', '789 Nguyễn Trãi, Q.5, TP.HCM', 2000000),
  ('cust-004', 'KH004', 'Phạm Thị D', '0945678901', 'phamthid@gmail.com', '321 Trần Hưng Đạo, Q.10, TP.HCM', 800000),
  ('cust-005', 'KH005', 'Hoàng Văn E', '0956789012', 'hoange@gmail.com', '654 Võ Văn Tần, Q.3, TP.HCM', 1500000),
  ('cust-006', 'KH000', 'Khách vãng lai', '0900000000', NULL, NULL, 0);

-- Update store info
UPDATE store SET name = 'Cửa hàng Thuốc BVTV & Cây Giống', address = '123 Đường ABC, Quận 1, TP.HCM', phone = '0909123456', tax_code = '0123456789' WHERE id = 'default-store';

-- Print confirmation
SELECT 'Seed data inserted successfully!' as status;
SELECT COUNT(*) as total_products FROM products;
SELECT COUNT(*) as total_customers FROM customers;
SELECT COUNT(*) as total_categories FROM categories;
