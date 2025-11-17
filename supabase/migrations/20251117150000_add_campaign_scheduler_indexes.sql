/*
  # Campaign Scheduler Optimization

  1. Indexes
    - Add index for active campaigns query (status, start_date, end_date)
    - Add index for email logs daily volume check (campaign_id, sent_at)
    - Add index for prospects query (list_id, status, last_contacted_at)
    - Add index for warmup pool query (status, mx_verified, bounce_rate, usage_count)

  2. Performance
    - These indexes optimize the campaign scheduler queries
    - Improves performance when processing large numbers of campaigns
*/

-- Index for fetching active campaigns efficiently
CREATE INDEX IF NOT EXISTS idx_campaigns_active_dates 
  ON warmup_campaigns(status, start_date, end_date) 
  WHERE status = 'active';

-- Index for checking daily volume limits
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_sent_at 
  ON email_logs(campaign_id, sent_at);

-- Index for finding next prospects to contact
CREATE INDEX IF NOT EXISTS idx_prospects_contactable 
  ON prospects(list_id, status, last_contacted_at) 
  WHERE status = 'active' AND last_contacted_at IS NULL;

-- Index for warmup pool selection
CREATE INDEX IF NOT EXISTS idx_warmup_pool_active 
  ON warmup_email_pool(status, mx_verified, bounce_rate, usage_count) 
  WHERE status = 'active' AND mx_verified = true;

-- Index for detecting completed campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_completion 
  ON warmup_campaigns(status, end_date) 
  WHERE status = 'active';

-- Add comment to document the tracking fields in settings JSONB
COMMENT ON COLUMN warmup_campaigns.settings IS 
  'Campaign settings and tracking data. Includes:
  - last_send_date: Date of last email send (YYYY-MM-DD)
  - emails_sent_today: Number of emails sent today
  - total_emails_sent: Total emails sent in campaign lifetime
  - sender_name: Sender name for outreach campaigns
  - sender_company: Sender company for outreach campaigns
  - sender_title: Sender title for outreach campaigns';
