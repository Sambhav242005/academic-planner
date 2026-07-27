-- Auth.js Supabase Adapter schema
-- Required by @auth/supabase-adapter (uses next_auth schema by default)

CREATE SCHEMA IF NOT EXISTS next_auth;

GRANT USAGE ON SCHEMA next_auth TO service_role;
GRANT ALL ON SCHEMA next_auth TO postgres;

-- Users table
CREATE TABLE IF NOT EXISTS next_auth.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  email text,
  "emailVerified" timestamptz,
  image text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email)
);

GRANT ALL ON TABLE next_auth.users TO postgres;
GRANT ALL ON TABLE next_auth.users TO service_role;

-- uid() helper used by RLS when sending custom JWTs
CREATE OR REPLACE FUNCTION next_auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(
      NULLIF(current_setting('request.jwt.claim.sub', true), ''),
      (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
$$;

-- Sessions table
CREATE TABLE IF NOT EXISTS next_auth.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  expires timestamptz NOT NULL,
  "sessionToken" text NOT NULL,
  "userId" uuid,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_session_token_key UNIQUE ("sessionToken"),
  CONSTRAINT sessions_user_id_fkey
    FOREIGN KEY ("userId")
    REFERENCES next_auth.users (id)
    ON DELETE CASCADE
);

GRANT ALL ON TABLE next_auth.sessions TO postgres;
GRANT ALL ON TABLE next_auth.sessions TO service_role;

-- Accounts table
CREATE TABLE IF NOT EXISTS next_auth.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL,
  provider text NOT NULL,
  "providerAccountId" text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  oauth_token_secret text,
  oauth_token text,
  "userId" uuid,
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_provider_key UNIQUE (provider, "providerAccountId"),
  CONSTRAINT accounts_user_id_fkey
    FOREIGN KEY ("userId")
    REFERENCES next_auth.users (id)
    ON DELETE CASCADE
);

GRANT ALL ON TABLE next_auth.accounts TO postgres;
GRANT ALL ON TABLE next_auth.accounts TO service_role;

-- Verification tokens table
CREATE TABLE IF NOT EXISTS next_auth.verification_tokens (
  identifier text,
  token text NOT NULL,
  expires timestamptz NOT NULL,
  CONSTRAINT verification_tokens_pkey PRIMARY KEY (token),
  CONSTRAINT verification_tokens_token_identifier_key UNIQUE (token, identifier)
);

GRANT ALL ON TABLE next_auth.verification_tokens TO postgres;
GRANT ALL ON TABLE next_auth.verification_tokens TO service_role;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON next_auth.users (email);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON next_auth.sessions ("userId");
CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON next_auth.accounts ("userId");
CREATE INDEX IF NOT EXISTS accounts_provider_idx ON next_auth.accounts (provider, "providerAccountId");
