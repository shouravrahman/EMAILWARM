/*
  # Email Logs Enhancements

  1. New Columns
    - Add metadata jsonb column for storing additional email data
    - Add click_count for tracking link clicks
    - Add click_data jsonb for storing click information
    - Add bounce_reason for detailed bounce information
    - Add spam_at timestamp for spam complaints
    - Add unsubscribed_at timestamp for unsubscribe events

  2. Indexes
    - Add performance indexes for common queries
    - Add composite indexes for analytics queries

  3. Functions
    - Add function to calculate email engagement scores
    - Add function to get campaign performance metrics
*/

-- Add new columns to email_logs table
DO $$
BEGIN
  -- Add metadata column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN metadata jsonb DEFAULT '{}';
  END IF;

  -- Add click tracking columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'click_count'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN click_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'click_data'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN click_data jsonb DEFAULT '[]';
  END IF;

  -- Add bounce reason
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'bounce_reason'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN bounce_reason text;
  END IF;

  -- Add spam tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'spam_at'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN spam_at timestamptz;
  END IF;

  -- Add unsubscribe tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'unsubscribed_at'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN unsubscribed_at timestamptz;
  END IF;

  -- Add last activity timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN last_activity_at timestamptz;
  END IF;
END $$;

-- Update the status check constraint to include new statuses
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_status_check;
ALTER TABLE email_logs ADD CONSTRAINT email_logs_status_check 
  CHECK (status IN ('sent', 'delivered', 'opened', 'replied', 'bounced', 'spam', 'unsubscribed'));

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_status ON email_logs(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at_desc ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_message_id ON email_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_engagement ON email_logs(campaign_id, open_count, reply_count);

-- Add GIN index for metadata searches
CREATE INDEX IF NOT EXISTS idx_email_logs_metadata ON email_logs USING GIN (metadata);

-- Function to calculate email engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  p_open_count integer,
  p_reply_count integer,
  p_click_count integer,
  p_status text
) RETURNS integer AS $$
BEGIN
  RETURN CASE
    WHEN p_status = 'bounced' OR p_status = 'spam' THEN -10
    WHEN p_status = 'unsubscribed' THEN -5
    WHEN p_reply_count > 0 THEN 100 + (p_reply_count * 50)
    WHEN p_click_count > 0 THEN 75 + (p_click_count * 25)
    WHEN p_open_count > 0 THEN 50 + (p_open_count * 10)
    WHEN p_status = 'delivered' THEN 25
    WHEN p_status = 'sent' THEN 10
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get campaign performance metrics
CREATE OR REPLACE FUNCTION get_campaign_metrics(p_campaign_id uuid)
RETURNS TABLE (
  total_sent bigint,
  total_delivered bigint,
  total_opened bigint,
  total_replied bigint,
  total_bounced bigint,
  total_clicked bigint,
  open_rate numeric,
  reply_rate numeric,
  bounce_rate numeric,
  click_rate numeric,
  avg_engagement_score numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE status = 'delivered') as total_delivered,
    COUNT(*) FILTER (WHERE open_count > 0) as total_opened,
    COUNT(*) FILTER (WHERE reply_count > 0) as total_replied,
    COUNT(*) FILTER (WHERE status = 'bounced') as total_bounced,
    COUNT(*) FILTER (WHERE click_count > 0) as total_clicked,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE open_count > 0)::numeric / COUNT(*)) * 100, 2)
      ELSE 0
    END as open_rate,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE reply_count > 0)::numeric / COUNT(*)) * 100, 2)
      ELSE 0
    END as reply_rate,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'bounced')::numeric / COUNT(*)) * 100, 2)
      ELSE 0
    END as bounce_rate,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE click_count > 0)::numeric / COUNT(*)) * 100, 2)
      ELSE 0
    END as click_rate,
    ROUND(AVG(calculate_engagement_score(open_count, reply_count, click_count, status)), 2) as avg_engagement_score
  FROM email_logs
  WHERE campaign_id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update last activity timestamp
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_activity_at when engagement metrics change
  IF (OLD.open_count != NEW.open_count OR 
      OLD.reply_count != NEW.reply_count OR 
      OLD.click_count != NEW.click_count OR
      OLD.status != NEW.status) THEN
    NEW.last_activity_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for last activity updates
DROP TRIGGER IF EXISTS trigger_update_last_activity ON email_logs;
CREATE TRIGGER trigger_update_last_activity
  BEFORE UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_last_activity();

-- Add RLS policy for email logs analytics
CREATE POLICY "Users can view email log analytics"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warmup_campaigns 
      WHERE warmup_campaigns.id = email_logs.campaign_id 
      AND warmup_campaigns.user_id = auth.uid()
    )
  );