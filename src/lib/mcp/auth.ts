import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const KEY_PREFIX = 'ap_'
const KEY_LENGTH = 48

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = KEY_PREFIX + crypto.randomBytes(KEY_LENGTH).toString('base64url')
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  const prefix = raw.slice(0, 8) + '...'
  return { raw, hash, prefix }
}

export async function validateApiKey(key: string): Promise<string | null> {
  if (!key.startsWith(KEY_PREFIX)) return null

  const hash = crypto.createHash('sha256').update(key).digest('hex')
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('mcp_api_keys')
    .select('user_id')
    .eq('key_hash', hash)
    .single()

  if (!data) return null

  await supabase
    .from('mcp_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', hash)

  return data.user_id
}
