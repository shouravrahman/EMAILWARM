/*
  # Subscription Management and Warmup Pools

  1. New Tables
    - `user_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `lemonsqueezy_subscription_id` (text, unique)
      - `lemonsqueezy_customer_id` (text)
      - `plan_id` (text - starter, professional, enterprise)
      - `status` (text - active, cancelled, expired, past_due)
      - `current_period_start` (timestamp)
      - `current_period_end` (timestamp)
      - `cancel_at_period_end` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `warmup_pools`
      - `id` (uuid, primary key)
      - `name` (text)
      - `emails` (jsonb array)
      - `domains` (jsonb array)
      - `reputation_score` (integer)
      - `last_activity` (timestamp)
      - `status` (text - active, inactive, maintenance)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `warmup_conversations`
      - `id` (uuid, primary key)
      - `sender_email` (text)
      - `recipient_email` (text)
      - `conversation_data` (jsonb)
      - `relationship_strength` (integer, default 0)
      - `status` (text - active, completed, paused)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `ai_generation_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `type` (text)
      - `context` (jsonb)
      - `constraints` (jsonb)
      - `generated_subject` (text)
      - `generated_body` (text)
      - `confidence` (numeric)
      - `tone` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for user data access
    - Secure subscription data access
*/

-- User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  lemonsqueezy_subscription_id text UNIQUE,
  lemonsqueezy_customer_id text,
  plan_id text DEFAULT 'starter' CHECK (plan_id IN ('starter', 'professional', 'enterprise')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'trialing')),
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz DEFAULT (now() + interval '1 month'),
  cancel_at_period_end boolean DEFAULT false,
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Warmup Pools Table
CREATE TABLE IF NOT EXISTS warmup_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emails jsonb NOT NULL DEFAULT '[]',
  domains jsonb NOT NULL DEFAULT '[]',
  reputation_score integer DEFAULT 85 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  last_activity timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Warmup Conversations Table
CREATE TABLE IF NOT EXISTS warmup_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_email text NOT NULL,
  recipient_email text NOT NULL,
  conversation_data jsonb NOT NULL DEFAULT '{}',
  relationship_strength integer DEFAULT 0 CHECK (relationship_strength >= 0 AND relationship_strength <= 100),
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sender_email, recipient_email)
);

-- AI Generation Logs Table
CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  context jsonb DEFAULT '{}',
  constraints jsonb DEFAULT '{}',
  generated_subject text,
  generated_body text,
  confidence numeric DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  tone text DEFAULT 'professional',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE warmup_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE warmup_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for User Subscriptions
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Warmup Pools (read-only for users)
CREATE POLICY "Users can view active warmup pools"
  ON warmup_pools
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- RLS Policies for Warmup Conversations
CREATE POLICY "Users can view conversations for their emails"
  ON warmup_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM connected_emails 
      WHERE connected_emails.email_address = warmup_conversations.sender_email 
      AND connected_emails.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage warmup conversations"
  ON warmup_conversations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM connected_emails 
      WHERE connected_emails.email_address = warmup_conversations.sender_email 
      AND connected_emails.user_id = auth.uid()
    )
  );

-- RLS Policies for AI Generation Logs
CREATE POLICY "Users can view their own AI logs"
  ON ai_generation_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI logs"
  ON ai_generation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_lemonsqueezy_id ON user_subscriptions(lemonsqueezy_subscription_id);

CREATE INDEX IF NOT EXISTS idx_warmup_pools_status ON warmup_pools(status);
CREATE INDEX IF NOT EXISTS idx_warmup_pools_reputation ON warmup_pools(reputation_score);

CREATE INDEX IF NOT EXISTS idx_warmup_conversations_sender ON warmup_conversations(sender_email);
CREATE INDEX IF NOT EXISTS idx_warmup_conversations_recipient ON warmup_conversations(recipient_email);
CREATE INDEX IF NOT EXISTS idx_warmup_conversations_status ON warmup_conversations(status);

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_user_id ON ai_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_type ON ai_generation_logs(type);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_created_at ON ai_generation_logs(created_at);

-- Function to check subscription limits
CREATE OR REPLACE FUNCTION check_user_limits(p_user_id uuid)
RETURNS TABLE (
  email_accounts_limit integer,
  daily_volume_limit integer,
  current_email_accounts bigint,
  can_add_email boolean,
  plan_id text,
  subscription_status text
) AS $$
DECLARE
  subscription_record RECORD;
BEGIN
  -- Get user subscription
  SELECT * INTO subscription_record
  FROM user_subscriptions
  WHERE user_id = p_user_id;
  
  -- Default limits for trial/free users
  email_accounts_limit := 1;
  daily_volume_limit := 10;
  plan_id := 'trial';
  subscription_status := 'trial';
  
  -- Set limits based on subscription
  IF subscription_record.status = 'active' THEN
    subscription_status := subscription_record.status;
    plan_id := subscription_record.plan_id;
    
    CASE subscription_record.plan_id
      WHEN 'starter' THEN
        email_accounts_limit := 3;
        daily_volume_limit := 150;
      WHEN 'professional' THEN
        email_accounts_limit := 10;
        daily_volume_limit := 1000;
      WHEN 'enterprise' THEN
        email_accounts_limit := 50;
        daily_volume_limit := 5000;
    END CASE;
  END IF;
  
  -- Get current email accounts count
  SELECT COUNT(*) INTO current_email_accounts
  FROM connected_emails
  WHERE user_id = p_user_id AND status = 'active';
  
  can_add_email := current_email_accounts < email_accounts_limit;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get subscription status
CREATE OR REPLACE FUNCTION get_user_subscription_status(p_user_id uuid)
RETURNS TABLE (
  has_active_subscription boolean,
  plan_id text,
  status text,
  trial_ends_at timestamptz,
  current_period_end timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(us.status = 'active', false) as has_active_subscription,
    COALESCE(us.plan_id, 'trial') as plan_id,
    COALESCE(us.status, 'trial') as status,
    us.trial_ends_at,
    us.current_period_end
  FROM user_subscriptions us
  WHERE us.user_id = p_user_id;
  
  -- If no subscription found, return trial defaults
  IF NOT FOUND THEN
    has_active_subscription := false;
    plan_id := 'trial';
    status := 'trial';
    trial_ends_at := now() + interval '14 days';
    current_period_end := null;
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update triggers for timestamps
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warmup_pools_updated_at
  BEFORE UPDATE ON warmup_pools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warmup_conversations_updated_at
  BEFORE UPDATE ON warmup_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();