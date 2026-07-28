import { NextResponse } from 'next/server'

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://planner.sambhav-surana.online'
}

export async function GET() {
  const baseUrl = getBaseUrl()

  const metadata = {
    resource: `${baseUrl}/api/mcp`,
    authorization_servers: [baseUrl],
    scopes_supported: ['mcp:read', 'mcp:write'],
    resource_documentation: 'https://github.com/your-repo/academic-planner',
  }

  return NextResponse.json(metadata, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/json',
    },
  })
}
