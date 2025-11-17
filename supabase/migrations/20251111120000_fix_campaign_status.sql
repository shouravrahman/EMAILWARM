ALTER TABLE warmup_campaigns
ADD COLUMN IF NOT EXISTS started_at timestamptz,
ADD COLUMN IF NOT EXISTS paused_at timestamptz;
