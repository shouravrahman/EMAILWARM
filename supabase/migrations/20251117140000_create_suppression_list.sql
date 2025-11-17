-- Create suppression_list table for unsubscribe management
CREATE TABLE IF NOT EXISTS suppression_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  reason TEXT,
  source TEXT CHECK (source IN ('unsubscribe', 'bounce', 'spam_complaint', 'manual')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast email lookups
CREATE INDEX idx_suppression_email ON suppression_list(email);
CREATE INDEX idx_suppression_source ON suppression_list(source);

-- Add RLS policies
ALTER TABLE suppression_list ENABLE ROW LEVEL SECURITY;

-- Service role can manage all suppression list entries
CREATE POLICY "Service role can manage suppression list"
  ON suppression_list
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Public can insert (for unsubscribe page)
CREATE POLICY "Public can add to suppression list"
  ON suppression_list
  FOR INSERT
  WITH CHECK (true);

-- Function to check if email is suppressed
CREATE OR REPLACE FUNCTION is_email_suppressed(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM suppression_list WHERE email = check_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
