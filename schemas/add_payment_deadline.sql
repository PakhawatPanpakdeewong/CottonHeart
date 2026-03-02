-- Migration: Add payment_deadline_at for 30-minute payment timer
-- Run this against your database: psql -f schemas/add_payment_deadline.sql

-- Add column (use lowercase if your tables are lowercase)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_deadline_at TIMESTAMP WITH TIME ZONE;

-- Add comment
COMMENT ON COLUMN payments.payment_deadline_at IS 'Deadline for customer to complete bank transfer (30 min from proceed)';
