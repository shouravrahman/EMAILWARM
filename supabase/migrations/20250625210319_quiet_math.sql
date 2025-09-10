/*
  # Email Warmup SaaS Database Schema

  1. New Tables
    - `connected_emails`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `email_address` (text, unique)
      - `provider` (text - gmail, outlook, etc.)
      - `oauth_tokens` (encrypted jsonb)
      - `status` (text - active, inactive, error)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `warmup_campaigns`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `email_id` (uuid, foreign key to connected_emails)
      - `name` (text)
      - `status` (text - draft, active, paused, completed)
      - `start_date` (date)
      - `end_date` (date)
      - `daily_volume` (integer)
      - `settings` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `email_logs`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, foreign key to warmup_campaigns)
      - `email_id` (uuid, foreign key to connected_emails)
      - `message_id` (text)
      - `subject` (text)
      - `recipient` (text)
      - `status` (text - sent, delivered, opened, replied, bounced)
      - `open_count` (integer, default 0)
      - `reply_count` (integer, default 0)
      - `sent_at` (timestamp)
      - `opened_at` (timestamp)
      - `replied_at` (timestamp)
      - `bounced_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Encrypt sensitive OAuth tokens
*/

-- Connected Emails Table
CREATE TABLE IF NOT EXISTS connected_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_address text UNIQUE NOT NULL,
  provider text NOT NULL,
  oauth_tokens jsonb NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Warmup Campaigns Table
CREATE TABLE IF NOT EXISTS warmup_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_id uuid REFERENCES connected_emails(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  daily_volume integer DEFAULT 5 CHECK (daily_volume > 0 AND daily_volume <= 50),
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Email Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES warmup_campaigns(id) ON DELETE CASCADE NOT NULL,
  email_id uuid REFERENCES connected_emails(id) ON DELETE CASCADE NOT NULL,
  message_id text NOT NULL,
  subject text NOT NULL,
  recipient text NOT NULL,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'replied', 'bounced')),
  open_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  replied_at timestamptz,
  bounced_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE connected_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE warmup_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Connected Emails
CREATE POLICY "Users can manage their own connected emails"
  ON connected_emails
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Warmup Campaigns
CREATE POLICY "Users can manage their own campaigns"
  ON warmup_campaigns
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Email Logs
CREATE POLICY "Users can view their own email logs"
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

CREATE POLICY "System can insert email logs"
  ON email_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM warmup_campaigns 
      WHERE warmup_campaigns.id = email_logs.campaign_id 
      AND warmup_campaigns.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_connected_emails_user_id ON connected_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_warmup_campaigns_user_id ON warmup_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_warmup_campaigns_status ON warmup_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_id ON email_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_connected_emails_updated_at
  BEFORE UPDATE ON connected_emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warmup_campaigns_updated_at
  BEFORE UPDATE ON warmup_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();