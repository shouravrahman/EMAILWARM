/*
  # Production Schema for WarmupPro

  1. Enhanced Tables
    - Add subscription management
    - Add warmup pool system
    - Add AI generation tracking
    - Add admin controls

  2. Security
    - Enhanced RLS policies
    - Admin access controls
    - Subscription validation

  3. Functions
    - Subscription limit checking
    - Campaign analytics
    - Pool management
*/

-- User Subscriptions Table (Enhanced)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  lemonsqueezy_subscription_id text UNIQUE,
  lemonsqueezy_customer_id text,
  plan_id text DEFAULT 'trial' CHECK (plan_id IN ('trial', 'starter', 'professional', 'enterprise')),
  status text DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'cancelled', 'expired', 'past_due')),
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz DEFAULT (now() + interval '1 month'),
  cancel_at_period_end boolean DEFAULT false,
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Warmup Pools Table (Enhanced)
CREATE TABLE IF NOT EXISTS warmup_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emails jsonb NOT NULL DEFAULT '[]',
  domains jsonb NOT NULL DEFAULT '[]',
  reputation_score integer DEFAULT 85 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  last_activity timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  pool_type text DEFAULT 'general' CHECK (pool_type IN ('general', 'business', 'tech', 'marketing')),
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
  last_interaction timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sender_email, recipient_email)
);

-- AI Generation Logs Table
CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES warmup_campaigns(id) ON DELETE CASCADE,
  type text NOT NULL,
  context jsonb DEFAULT '{}',
  constraints jsonb DEFAULT '{}',
  generated_subject text,
  generated_body text,
  confidence numeric DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  tone text DEFAULT 'professional',
  previous_emails jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE warmup_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE warmup_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for User Subscriptions
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage subscriptions"
  ON user_subscriptions
  FOR ALL
  TO service_role
  USING (true);

-- RLS Policies for Warmup Pools
CREATE POLICY "Users can view active warmup pools"
  ON warmup_pools
  FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Admins can manage warmup pools"
  ON warmup_pools
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
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

-- RLS Policies for System Settings
CREATE POLICY "Admins can manage system settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Enhanced subscription limit checking function
CREATE OR REPLACE FUNCTION check_user_limits(p_user_id uuid)
RETURNS TABLE (
  email_accounts_limit integer,
  daily_volume_limit integer,
  campaigns_limit integer,
  current_email_accounts bigint,
  current_campaigns bigint,
  daily_emails_sent bigint,
  can_add_email boolean,
  can_create_campaign boolean,
  plan_id text,
  subscription_status text,
  trial_days_left integer
) AS $$
DECLARE
  subscription_record RECORD;
  today_start timestamptz := date_trunc('day', now());
BEGIN
  -- Get user subscription
  SELECT * INTO subscription_record
  FROM user_subscriptions
  WHERE user_id = p_user_id;
  
  -- Default limits for trial users
  email_accounts_limit := 1;
  daily_volume_limit := 10;
  campaigns_limit := 1;
  plan_id := 'trial';
  subscription_status := 'trial';
  trial_days_left := 14;
  
  -- Set limits based on subscription
  IF subscription_record.id IS NOT NULL THEN
    subscription_status := subscription_record.status;
    plan_id := subscription_record.plan_id;
    
    -- Calculate trial days left
    IF subscription_record.trial_ends_at IS NOT NULL THEN
      trial_days_left := GREATEST(0, EXTRACT(days FROM subscription_record.trial_ends_at - now())::integer);
    END IF;
    
    CASE subscription_record.plan_id
      WHEN 'starter' THEN
        email_accounts_limit := 3;
        daily_volume_limit := 150;
        campaigns_limit := 5;
      WHEN 'professional' THEN
        email_accounts_limit := 10;
        daily_volume_limit := 1000;
        campaigns_limit := 20;
      WHEN 'enterprise' THEN
        email_accounts_limit := 50;
        daily_volume_limit := 5000;
        campaigns_limit := 100;
    END CASE;
  END IF;
  
  -- Get current usage
  SELECT COUNT(*) INTO current_email_accounts
  FROM connected_emails
  WHERE user_id = p_user_id AND status = 'active';
  
  SELECT COUNT(*) INTO current_campaigns
  FROM warmup_campaigns
  WHERE user_id = p_user_id AND status IN ('active', 'paused');
  
  SELECT COUNT(*) INTO daily_emails_sent
  FROM email_logs el
  JOIN warmup_campaigns wc ON el.campaign_id = wc.id
  WHERE wc.user_id = p_user_id 
  AND el.sent_at >= today_start;
  
  can_add_email := current_email_accounts < email_accounts_limit;
  can_create_campaign := current_campaigns < campaigns_limit;
  
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
  current_period_end timestamptz,
  cancel_at_period_end boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(us.status IN ('active', 'trialing'), false) as has_active_subscription,
    COALESCE(us.plan_id, 'trial') as plan_id,
    COALESCE(us.status, 'trial') as status,
    us.trial_ends_at,
    us.current_period_end,
    COALESCE(us.cancel_at_period_end, false) as cancel_at_period_end
  FROM user_subscriptions us
  WHERE us.user_id = p_user_id;
  
  -- If no subscription found, return trial defaults
  IF NOT FOUND THEN
    has_active_subscription := true; -- Trial is considered active
    plan_id := 'trial';
    status := 'trialing';
    trial_ends_at := now() + interval '14 days';
    current_period_end := null;
    cancel_at_period_end := false;
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize warmup pools
CREATE OR REPLACE FUNCTION initialize_warmup_pools()
RETURNS void AS $$
BEGIN
  -- Insert default warmup pools if they don't exist
  INSERT INTO warmup_pools (name, emails, domains, pool_type, reputation_score)
  SELECT * FROM (VALUES
    ('Business Network Pool', 
     '["contact@biznetwork.com", "hello@profconnect.net", "info@businesshub.org", "network@corpconnect.com", "reach@bizlink.net"]'::jsonb,
     '["biznetwork.com", "profconnect.net", "businesshub.org", "corpconnect.com", "bizlink.net"]'::jsonb,
     'business', 90),
    ('Tech Industry Pool',
     '["dev@techpool.io", "code@devnetwork.com", "build@innovators.tech", "create@techconnect.dev", "hello@codebase.io"]'::jsonb,
     '["techpool.io", "devnetwork.com", "innovators.tech", "techconnect.dev", "codebase.io"]'::jsonb,
     'tech', 92),
    ('Marketing Pool',
     '["market@marketers.pro", "brand@adnetwork.com", "growth@brandpool.net", "reach@marketconnect.com", "engage@growthnet.io"]'::jsonb,
     '["marketers.pro", "adnetwork.com", "brandpool.net", "marketconnect.com", "growthnet.io"]'::jsonb,
     'marketing', 88)
  ) AS pools(name, emails, domains, pool_type, reputation_score)
  WHERE NOT EXISTS (SELECT 1 FROM warmup_pools WHERE warmup_pools.name = pools.name);
END;
$$ LANGUAGE plpgsql;

-- Initialize pools
SELECT initialize_warmup_pools();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_lemonsqueezy_id ON user_subscriptions(lemonsqueezy_subscription_id);

CREATE INDEX IF NOT EXISTS idx_warmup_pools_status ON warmup_pools(status);
CREATE INDEX IF NOT EXISTS idx_warmup_pools_type ON warmup_pools(pool_type);
CREATE INDEX IF NOT EXISTS idx_warmup_pools_reputation ON warmup_pools(reputation_score);

CREATE INDEX IF NOT EXISTS idx_warmup_conversations_sender ON warmup_conversations(sender_email);
CREATE INDEX IF NOT EXISTS idx_warmup_conversations_recipient ON warmup_conversations(recipient_email);
CREATE INDEX IF NOT EXISTS idx_warmup_conversations_status ON warmup_conversations(status);

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_user_id ON ai_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_campaign_id ON ai_generation_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_type ON ai_generation_logs(type);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_created_at ON ai_generation_logs(created_at);

-- Update triggers
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warmup_pools_updated_at
  BEFORE UPDATE ON warmup_pools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warmup_conversations_updated_at
  BEFORE UPDATE ON warmup_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();