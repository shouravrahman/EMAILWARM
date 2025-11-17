/*
  # Prospect Outreach Feature - Database Schema

  1. New Tables
    - `prospect_lists` - Stores prospect list metadata
    - `prospects` - Stores individual prospect data
  
  2. Table Extensions
    - `warmup_campaigns` - Add campaign_type, prospect_list_id, outreach_mode, personalization_template
    - `email_logs` - Add prospect_id for tracking outreach emails
  
  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users to access their own data
*/

-- Prospect Lists Table
CREATE TABLE IF NOT EXISTS prospect_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  source text NOT NULL CHECK (source IN ('csv', 'google_sheets')),
  google_sheet_id text,
  google_sheet_url text,
  total_prospects integer DEFAULT 0,
  active_prospects integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Prospects Table
CREATE TABLE IF NOT EXISTS prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  list_id uuid REFERENCES prospect_lists(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  first_name text,
  last_name text,
  company text,
  title text,
  custom_field_1 text,
  custom_field_2 text,
  custom_field_3 text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'contacted', 'engaged', 'replied', 'bounced', 'unsubscribed')),
  last_contacted_at timestamptz,
  engagement_score integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(list_id, email)
);

-- Extend warmup_campaigns table
ALTER TABLE warmup_campaigns 
  ADD COLUMN IF NOT EXISTS campaign_type text DEFAULT 'warmup' CHECK (campaign_type IN ('warmup', 'outreach')),
  ADD COLUMN IF NOT EXISTS prospect_list_id uuid REFERENCES prospect_lists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS outreach_mode text CHECK (outreach_mode IN ('automated', 'manual')),
  ADD COLUMN IF NOT EXISTS personalization_template text;

-- Extend email_logs table
ALTER TABLE email_logs
  ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL;

-- Enable Row Level Security
ALTER TABLE prospect_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Prospect Lists
CREATE POLICY "Users can manage their own prospect lists"
  ON prospect_lists
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Prospects
CREATE POLICY "Users can manage their own prospects"
  ON prospects
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prospect_lists_user_id ON prospect_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_prospects_user_id ON prospects(user_id);
CREATE INDEX IF NOT EXISTS idx_prospects_list_id ON prospects(list_id);
CREATE INDEX IF NOT EXISTS idx_prospects_email ON prospects(email);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON warmup_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_prospect_list ON warmup_campaigns(prospect_list_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_prospect_id ON email_logs(prospect_id);

-- Update timestamps trigger for new tables
CREATE TRIGGER update_prospect_lists_updated_at
  BEFORE UPDATE ON prospect_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
