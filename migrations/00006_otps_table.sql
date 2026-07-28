-- OTP tokens for email-based sign-in
-- Replaces magic link flow in next_auth.verification_tokens

CREATE TABLE IF NOT EXISTS next_auth.otps (
  identifier text NOT NULL,
  otp_hash text NOT NULL,
  expires timestamptz NOT NULL,
  attempts smallint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (identifier)
);

GRANT ALL ON TABLE next_auth.otps TO postgres;
GRANT ALL ON TABLE next_auth.otps TO service_role;
