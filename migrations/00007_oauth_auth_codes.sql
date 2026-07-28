-- OAuth authorization codes for ChatGPT MCP integration
-- Used during the OAuth 2.1 PKCE flow

CREATE TABLE oauth_auth_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL DEFAULT 'S256',
  scope TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for cleanup and lookup
CREATE INDEX idx_oauth_auth_codes_code ON oauth_auth_codes(code);
CREATE INDEX idx_oauth_auth_codes_expires ON oauth_auth_codes(expires_at);

-- RLS: users can only see their own codes (service role bypasses this)
ALTER TABLE oauth_auth_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own OAuth codes"
  ON oauth_auth_codes FOR SELECT
  USING (auth.uid() = user_id);

-- Cleanup function for expired codes
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_auth_codes WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
