import { createAdminClient as createServerAdminClient } from '@supabase/server/core'

export function createAdminClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerAdminClient<any>()
}

// Security model:
// - This client uses the service role key, which BYPASSES all RLS policies.
// - Every query MUST include .eq('user_id', userId) to enforce row-level ownership.
// - RLS policies (migration 00009) exist as a safety net for code using the
//   anon/user client, but they do NOT protect routes using this admin client.
