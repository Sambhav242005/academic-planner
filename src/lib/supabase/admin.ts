import { createAdminClient as createServerAdminClient } from '@supabase/server/core'

export function createAdminClient() {
  return createServerAdminClient<any>()
}
