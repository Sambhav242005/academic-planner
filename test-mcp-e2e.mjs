import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const BASE = process.argv[2] || 'https://planner.sambhav-surana.online';
const DEMO_EMAIL = 'user@academic-planner.dev';
const REDIRECT_URI = 'https://chatgpt.com/connector/oauth/';

async function post(path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${path} returned ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  console.log(`\n=== MCP OAuth + Tool Discovery Test ===\n`);
  console.log(`Server: ${BASE}\n`);

  // 1. Register client
  console.log('1. Registering OAuth client...');
  const registration = await post('/api/oauth/register', {
    client_name: 'MCP Test',
    redirect_uris: [REDIRECT_URI],
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  });
  const clientId = registration.client_id;
  console.log(`   Client ID: ${clientId}\n`);

  // 2. Build authorize URL
  console.log('2. Building authorize URL...');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = crypto.randomUUID();

  const oauthParams = {
    clientId,
    redirectUri: REDIRECT_URI,
    codeChallenge,
    codeChallengeMethod: 'S256',
    state,
    scope: 'mcp:read mcp:write',
  };
  const oauthB64 = Buffer.from(JSON.stringify(oauthParams)).toString('base64url');

  const authorizeUrl = new URL(`${BASE}/api/oauth/authorize`);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('scope', 'mcp:read mcp:write');
  console.log(`   URL: ${authorizeUrl.toString()}\n`);

  // 3. Send OTP (demo user skips email)
  console.log('3. Sending OTP (demo user — no email)...');
  const otpRes = await post('/api/auth/otp/send', { email: DEMO_EMAIL });
  console.log(`   Response: ${JSON.stringify(otpRes)}\n`);

  // 4. Verify OTP (demo user accepts any code)
  console.log('4. Verifying OTP (code: 000000)...');
  const verifyRes = await post('/api/oauth/verify', {
    email: DEMO_EMAIL,
    otp: '000000',
    oauth: oauthB64,
  });
  console.log(`   Redirect URL: ${verifyRes.redirect_to}\n`);

  // 5. Extract auth code from redirect URL
  const redirectUrl = new URL(verifyRes.redirect_to);
  const authCode = redirectUrl.searchParams.get('code');
  if (!authCode) throw new Error('No auth code in redirect URL');
  console.log(`5. Auth code: ${authCode}\n`);

  // 6. Exchange code for token
  console.log('6. Exchanging code for access token...');
  const tokenRes = await post('/api/oauth/token', {
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    code_verifier: codeVerifier,
  });
  const accessToken = tokenRes.access_token;
  console.log(`   Token type: ${tokenRes.token_type}`);
  console.log(`   Expires in: ${tokenRes.expires_in}s`);
  console.log(`   Token: ${accessToken.slice(0, 30)}...\n`);

  // 7. Connect MCP client
  console.log('7. Connecting MCP client...');
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(
    new globalThis.URL(`${BASE}/api/mcp`),
    {
      requestInit: {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      },
    }
  );

  await client.connect(transport);
  const serverInfo = client.getServerVersion();
  console.log(`   Server: ${serverInfo?.name} v${serverInfo?.version}\n`);

  // 8. List tools
  console.log('8. Listing tools...');
  const { tools } = await client.listTools();
  console.log(`   Found ${tools.length} tools:\n`);
  for (const tool of tools) {
    console.log(`   - ${tool.name}`);
    console.log(`     ${tool.description?.slice(0, 100)}`);
  }

  // 9. Test a tool call
  console.log('\n9. Testing list_semesters...');
  const result = await client.callTool({ name: 'list_semesters', arguments: {} });
  console.log(`   Result: ${JSON.stringify(result.content).slice(0, 200)}\n`);

  await client.close();
  console.log('=== All tests passed! ===\n');
}

function generateCodeVerifier() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(verifier));
  return Buffer.from(hash).toString('base64url');
}

main().catch(err => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
