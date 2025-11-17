CREATE TABLE warmup_email_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_address text NOT NULL UNIQUE,
  provider text,
  status text DEFAULT 'active',
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_warmup_email_pool_status ON warmup_email_pool(status);
CREATE INDEX idx_warmup_email_pool_last_used_at ON warmup_email_pool(last_used_at);

INSERT INTO warmup_email_pool (email_address, provider) VALUES
('warmup.recipient1@gmail.com', 'gmail'),
('warmup.recipient2@outlook.com', 'outlook'),
('warmup.recipient3@yahoo.com', 'yahoo'),
('warmup.recipient4@gmail.com', 'gmail'),
('warmup.recipient5@outlook.com', 'outlook');

ALTER TABLE warmup_email_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON warmup_email_pool
  FOR SELECT USING (true);
