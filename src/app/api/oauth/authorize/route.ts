import { NextRequest, NextResponse } from 'next/server'
import { isValidRedirectUri } from '@/lib/oauth/store'

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://planner.sambhav-surana.online'
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const responseType = searchParams.get('response_type')
  const clientId = searchParams.get('client_id')
  const redirectUri = searchParams.get('redirect_uri')
  const codeChallenge = searchParams.get('code_challenge')
  const codeChallengeMethod = searchParams.get('code_challenge_method')
  const state = searchParams.get('state')
  const scope = searchParams.get('scope')

  // Validate required params
  if (responseType !== 'code') {
    return badRequest('unsupported_response_type', 'Only response_type=code is supported')
  }
  if (!clientId) {
    return badRequest('invalid_request', 'client_id is required')
  }
  if (!redirectUri) {
    return badRequest('invalid_request', 'redirect_uri is required')
  }
  if (!isValidRedirectUri(redirectUri)) {
    return badRequest('invalid_request', 'Invalid redirect_uri')
  }
  if (!codeChallenge) {
    return badRequest('invalid_request', 'code_challenge is required')
  }
  if (codeChallengeMethod !== 'S256') {
    return badRequest('invalid_request', 'Only code_challenge_method=S256 is supported')
  }

  // Store OAuth params in a session cookie for the login page
  const baseUrl = getBaseUrl()
  const oauthParams = {
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    state,
    scope,
  }

  const loginUrl = new URL(`${baseUrl}/oauth/login`)
  loginUrl.searchParams.set('oauth', Buffer.from(JSON.stringify(oauthParams)).toString('base64url'))

  return NextResponse.redirect(loginUrl)
}

function badRequest(error: string, description: string): NextResponse {
  return NextResponse.json({ error, error_description: description }, { status: 400 })
}
