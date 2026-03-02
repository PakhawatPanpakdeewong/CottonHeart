-- Add OrderID to Reviews table for displaying order reference (optional migration)
-- Run: psql -f schemas/add_review_orderid.sql
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS orderid INTEGER REFERENCES orders(orderid) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(orderid);
