-- Add new pricing columns to user_subscriptions table
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS email_quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS price_per_email DECIMAL(10,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS total_monthly_cost DECIMAL(10,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Migrate existing quantity data to email_quantity if not already set
UPDATE user_subscriptions
SET email_quantity = quantity
WHERE email_quantity IS NULL AND quantity IS NOT NULL;

-- Calculate total_monthly_cost for existing subscriptions
UPDATE user_subscriptions
SET total_monthly_cost = email_quantity * price_per_email
WHERE total_monthly_cost IS NULL OR total_monthly_cost = 0;

-- Set trial_ends_at for existing trialing subscriptions that don't have it
UPDATE user_subscriptions
SET trial_ends_at = created_at + INTERVAL '10 days'
WHERE status IN ('trial', 'trialing') 
AND trial_ends_at IS NULL;

-- Update check_user_limits function to use email_quantity instead of quantity
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
  email_accounts_limit := 5; -- Free trial allows up to 5 emails
  daily_volume_limit := 50; -- Generous daily volume for trial
  campaigns_limit := 3; -- Allow a few campaigns for trial
  subscription_status := 'trialing';
  trial_days_left := 0;
  
  -- Calculate trial days left if applicable
  IF subscription_record.trial_ends_at IS NOT NULL AND subscription_record.status IN ('trial', 'trialing') THEN
    trial_days_left := GREATEST(0, EXTRACT(days FROM subscription_record.trial_ends_at - now())::integer);
    IF trial_days_left = 0 THEN
      -- Trial ended, set to inactive if not converted
      subscription_status := 'inactive';
    END IF;
  END IF;

  -- Override limits if user has an active paid subscription
  IF subscription_record.status = 'active' THEN
    subscription_status := 'active';
    email_accounts_limit := COALESCE(subscription_record.email_quantity, subscription_record.quantity, 1);
    daily_volume_limit := 5000; -- High limit for paid users
    campaigns_limit := 100; -- High limit for paid users
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

-- Add comment to document the schema
COMMENT ON COLUMN user_subscriptions.email_quantity IS 'Number of email accounts included in subscription';
COMMENT ON COLUMN user_subscriptions.price_per_email IS 'Price per email account per month in USD';
COMMENT ON COLUMN user_subscriptions.total_monthly_cost IS 'Total monthly subscription cost (email_quantity * price_per_email)';
COMMENT ON COLUMN user_subscriptions.trial_ends_at IS 'Timestamp when trial period ends';
