ALTER TABLE connected_emails
ADD COLUMN IF NOT EXISTS smtp_credentials jsonb;
