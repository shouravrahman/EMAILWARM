CREATE TABLE user_reputation (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  reputation_score numeric DEFAULT 75,
  history jsonb[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow user to read their own reputation" ON user_reputation
  FOR SELECT USING (auth.uid() = user_id);
