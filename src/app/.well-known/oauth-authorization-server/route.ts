import { NextResponse } from 'next/server'


function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://planner.sambhav-surana.online'
}

export async function GET() {
  const baseUrl = getBaseUrl()

  const metadata = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/oauth/authorize`,
    token_endpoint: `${baseUrl}/api/oauth/token`,
    registration_endpoint: `${baseUrl}/api/oauth/register`,
    jwks_uri: `${baseUrl}/.well-known/jwks`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: ['openid', 'profile', 'email', 'mcp:read', 'mcp:write'],
    client_id_metadata_document_supported: true,
    // Hardcoded client for ChatGPT (no DCR needed)
    // ChatGPT will use CIMD or DCR — we support both
  }

  return NextResponse.json(metadata, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/json',
    },
  })
}
