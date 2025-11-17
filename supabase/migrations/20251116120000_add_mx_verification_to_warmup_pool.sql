-- Add MX verification fields to warmup_email_pool table
ALTER TABLE warmup_email_pool
ADD COLUMN mx_verified boolean DEFAULT false,
ADD COLUMN mx_records jsonb,
ADD COLUMN usage_count integer DEFAULT 0,
ADD COLUMN bounce_count integer DEFAULT 0,
ADD COLUMN bounce_rate decimal(5,2) DEFAULT 0;

-- Create index for bounce tracking
CREATE INDEX idx_warmup_email_pool_bounce_rate ON warmup_email_pool(bounce_rate);

-- Update existing records to have usage_count initialized
UPDATE warmup_email_pool SET usage_count = 0 WHERE usage_count IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN warmup_email_pool.mx_verified IS 'Whether the email domain has been verified to have valid MX records';
COMMENT ON COLUMN warmup_email_pool.mx_records IS 'JSON array of MX records for the email domain';
COMMENT ON COLUMN warmup_email_pool.usage_count IS 'Number of times this email has been used in warmup campaigns';
COMMENT ON COLUMN warmup_email_pool.bounce_count IS 'Number of times emails to this address have bounced';
COMMENT ON COLUMN warmup_email_pool.bounce_rate IS 'Percentage of bounces (bounce_count / usage_count * 100)';
