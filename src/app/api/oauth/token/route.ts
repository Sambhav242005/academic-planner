import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { consumeAuthCode } from '@/lib/oauth/store'
import { getSigningKey, getKid } from '@/lib/oauth/keys'

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://planner.sambhav-surana.online'
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''
  let params: Record<string, string>

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text()
    params = Object.fromEntries(new URLSearchParams(text))
  } else {
    params = await request.json()
  }

  const { grant_type, code, redirect_uri, client_id, code_verifier } = params

  if (grant_type !== 'authorization_code') {
    return errorResponse('unsupported_grant_type', 'Only authorization_code grant is supported')
  }
  if (!code) {
    return errorResponse('invalid_request', 'code is required')
  }
  if (!redirect_uri) {
    return errorResponse('invalid_request', 'redirect_uri is required')
  }
  if (!client_id) {
    return errorResponse('invalid_request', 'client_id is required')
  }
  if (!code_verifier) {
    return errorResponse('invalid_request', 'code_verifier is required')
  }

  // Verify PKCE and consume the auth code
  const result = await consumeAuthCode(code, client_id, redirect_uri, code_verifier)

  if (!result) {
    return errorResponse('invalid_grant', 'Invalid or expired authorization code')
  }

  // Issue JWT access token
  const baseUrl = getBaseUrl()
  const signingKey = await getSigningKey()
  const kid = await getKid()

  const now = Math.floor(Date.now() / 1000)
  const accessToken = await new SignJWT({
    sub: result.userId,
    aud: `${baseUrl}/api/mcp`,
    scope: result.scope || 'mcp:read mcp:write',
  })
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuedAt(now)
    .setExpirationTime('1h')
    .setIssuer(baseUrl)
    .sign(signingKey)

  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: result.scope || 'mcp:read mcp:write',
  })
}

function errorResponse(error: string, description: string): NextResponse {
  return NextResponse.json(
    { error, error_description: description },
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  )
}
