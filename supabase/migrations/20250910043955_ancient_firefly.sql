/*
  # User Reports System

  1. New Tables
    - `user_reports`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text)
      - `description` (text)
      - `category` (text - bug, feature, support, billing, feedback)
      - `priority` (text - low, medium, high, critical)
      - `status` (text - open, in_progress, resolved, closed)
      - `admin_id` (uuid, foreign key to auth.users)
      - `admin_response` (text)
      - `resolved_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on user_reports table
    - Add policies for users to manage their own reports
    - Add policies for admins to manage all reports

  3. Indexes
    - Add performance indexes for common queries
*/

-- User Reports Table
CREATE TABLE IF NOT EXISTS user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text DEFAULT 'support' CHECK (category IN ('bug', 'feature', 'support', 'billing', 'feedback')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_id uuid REFERENCES auth.users(id),
  admin_response text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for User Reports
CREATE POLICY "Users can view their own reports"
  ON user_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports"
  ON user_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
  ON user_reports
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all reports"
  ON user_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can update all reports"
  ON user_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_reports_user_id ON user_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_priority ON user_reports(priority);
CREATE INDEX IF NOT EXISTS idx_user_reports_category ON user_reports(category);
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON user_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_user_reports_admin_id ON user_reports(admin_id);

-- Update trigger for reports
CREATE TRIGGER update_user_reports_updated_at
  BEFORE UPDATE ON user_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get report statistics
CREATE OR REPLACE FUNCTION get_report_statistics()
RETURNS TABLE (
  total_reports bigint,
  open_reports bigint,
  in_progress_reports bigint,
  resolved_reports bigint,
  critical_reports bigint,
  avg_resolution_time interval
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_reports,
    COUNT(*) FILTER (WHERE status = 'open') as open_reports,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_reports,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_reports,
    COUNT(*) FILTER (WHERE priority = 'critical') as critical_reports,
    AVG(resolved_at - created_at) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time
  FROM user_reports;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;