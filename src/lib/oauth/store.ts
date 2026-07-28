import { createAdminClient } from '@/lib/supabase/admin'

const CLIENT_ID = 'chatgpt-academic-planner'
const REDIRECT_URIS = [
  'https://chatgpt.com/connector/oauth/callback',
  'https://chatgpt.com/connector_platform_oauth_redirect',
]

export function getClientId(): string {
  return CLIENT_ID
}

export function isValidRedirectUri(uri: string): boolean {
  return REDIRECT_URIS.includes(uri)
}

export function getAllRedirectUris(): string[] {
  return [...REDIRECT_URIS]
}

export async function createAuthCode(params: {
  userId: string
  clientId: string
  redirectUri: string
  codeChallenge: string
  codeChallengeMethod: string
  scope?: string
}): Promise<string> {
  const code = generateCode()
  const supabase = createAdminClient()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

  const { error } = await supabase.from('oauth_auth_codes').insert({
    code,
    user_id: params.userId,
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code_challenge: params.codeChallenge,
    code_challenge_method: params.codeChallengeMethod,
    scope: params.scope ?? null,
    expires_at: expiresAt,
  })

  if (error) throw new Error(`Failed to create auth code: ${error.message}`)
  return code
}

export async function consumeAuthCode(
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier: string
): Promise<{ userId: string; scope: string | null } | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('oauth_auth_codes')
    .select('*')
    .eq('code', code)
    .eq('client_id', clientId)
    .eq('redirect_uri', redirectUri)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) return null

  // Verify PKCE
  const encoder = new TextEncoder()
  const hash = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(codeVerifier)
  )
  const challenge = Buffer.from(hash).toString('base64url')

  if (challenge !== data.code_challenge) return null

  // Delete the code (single use)
  await supabase.from('oauth_auth_codes').delete().eq('id', data.id)

  return { userId: data.user_id, scope: data.scope }
}

export async function cleanupExpiredCodes(): Promise<void> {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.rpc as any)('cleanup_expired_oauth_codes')
}

function generateCode(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
