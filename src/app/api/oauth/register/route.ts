import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CLIENT_ID = 'chatgpt-academic-planner'

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return badRequest('Invalid JSON')
  }

  const clientName = body.client_name || 'ChatGPT'
  const redirectUris = body.redirect_uris as string[] | undefined

  if (!redirectUris?.length) {
    return badRequest('redirect_uris is required')
  }

  // Store the registration (best-effort, don't block on error)
  const supabase = createAdminClient()
  await supabase.from('oauth_clients').upsert({
    client_id: CLIENT_ID,
    client_name: clientName,
    redirect_uris: redirectUris,
    grant_types: body.grant_types ?? ['authorization_code'],
    response_types: body.response_types ?? ['code'],
    token_endpoint_auth_method: body.token_endpoint_auth_method ?? 'none',
  }, { onConflict: 'client_id' })

  return NextResponse.json({
    client_id: CLIENT_ID,
    client_name: clientName,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: redirectUris,
    grant_types: body.grant_types ?? ['authorization_code'],
    response_types: body.response_types ?? ['code'],
    token_endpoint_auth_method: body.token_endpoint_auth_method ?? 'none',
  })
}

function badRequest(description: string) {
  return NextResponse.json(
    { error: 'invalid_request', error_description: description },
    { status: 400 }
  )
}
