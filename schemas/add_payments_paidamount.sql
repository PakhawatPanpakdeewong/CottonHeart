-- คอลัมน์ paidamount: ใช้ร่วมกับ paymentstatus สำหรับ logic แสดง "ชำระแล้ว" บนหน้ารายละเอียดออเดอร์
-- รันเมื่อตาราง payments ยังไม่มีคอลัมน์นี้ (PostgreSQL)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paidamount NUMERIC(12, 2) DEFAULT 0;
