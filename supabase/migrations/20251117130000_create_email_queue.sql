-- Create email_queue table for async email processing
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES warmup_campaigns(id) ON DELETE CASCADE,
  email_account_id UUID REFERENCES connected_emails(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  html_body TEXT,
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_email_queue_status ON email_queue(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_email_queue_campaign ON email_queue(campaign_id);
CREATE INDEX idx_email_queue_email_account ON email_queue(email_account_id);
CREATE INDEX idx_email_queue_scheduled ON email_queue(scheduled_for) WHERE status = 'pending';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_email_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_email_queue_updated_at();

-- Add RLS policies
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own queue items
CREATE POLICY "Users can view their own email queue items"
  ON email_queue
  FOR SELECT
  USING (
    email_account_id IN (
      SELECT id FROM connected_emails WHERE user_id = auth.uid()
    )
  );

-- Service role can manage all queue items
CREATE POLICY "Service role can manage email queue"
  ON email_queue
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
