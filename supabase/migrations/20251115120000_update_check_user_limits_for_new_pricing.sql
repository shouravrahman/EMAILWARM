ALTER TABLE user_subscriptions
ADD COLUMN quantity INTEGER DEFAULT 1;

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
  IF subscription_record.trial_ends_at IS NOT NULL AND subscription_record.status = 'trialing' THEN
    trial_days_left := GREATEST(0, EXTRACT(days FROM subscription_record.trial_ends_at - now())::integer);
    IF trial_days_left = 0 THEN
      -- Trial ended, set to inactive if not converted
      subscription_status := 'inactive';
    END IF;
  END IF;

  -- Override limits if user has an active paid subscription
  IF subscription_record.status = 'active' THEN
    subscription_status := 'active';
    email_accounts_limit := subscription_record.quantity; -- Use subscribed quantity
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

-- Update get_user_subscription_status to reflect new model
CREATE OR REPLACE FUNCTION get_user_subscription_status(p_user_id uuid)
RETURNS TABLE (
  has_active_subscription boolean,
  status text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(us.status IN ('active', 'trialing'), false) as has_active_subscription,
    COALESCE(us.status, 'trialing') as status,
    us.trial_ends_at,
    us.current_period_end,
    COALESCE(us.cancel_at_period_end, false) as cancel_at_period_end
  FROM user_subscriptions us
  WHERE us.user_id = p_user_id;
  
  -- If no subscription found, return trial defaults
  IF NOT FOUND THEN
    has_active_subscription := true; -- Trial is considered active
    status := 'trialing';
    trial_ends_at := now() + interval '10 days'; -- New 10-day trial
    current_period_end := null;
    cancel_at_period_end := false;
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;