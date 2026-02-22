-- Add CustomerID to Addresses table to link addresses to customers
-- Run this migration if addresses table exists without CustomerID

ALTER TABLE addresses ADD COLUMN IF NOT EXISTS customerid INTEGER REFERENCES customers(customerid) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_addresses_customerid ON addresses(customerid);
