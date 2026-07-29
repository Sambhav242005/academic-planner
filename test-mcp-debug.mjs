const BASE = 'http://localhost:3000';

async function main() {
  // Register
  const regRes = await fetch(`${BASE}/api/oauth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'test',
      redirect_uris: ['https://chatgpt.com/connector/oauth/'],
      grant_types: ['authorization_code'],
      response_types: ['code'],
    }),
  });
  const reg = await regRes.json();
  console.log('1. Client ID:', reg.client_id);

  // PKCE
  const verifier = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  const challenge = Buffer.from(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))).toString('base64url');
  const state = globalThis.crypto.randomUUID();

  // Send OTP
  await fetch(`${BASE}/api/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@academic-planner.dev' }),
  });
  console.log('2. OTP sent (demo)');

  // Verify
  const oauthParams = {
    clientId: reg.client_id,
    redirectUri: 'https://chatgpt.com/connector/oauth/',
    codeChallenge: challenge,
    codeChallengeMethod: 'S256',
    state,
    scope: 'mcp:read mcp:write',
  };
  const verifyRes = await fetch(`${BASE}/api/oauth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@academic-planner.dev',
      otp: '000000',
      oauth: Buffer.from(JSON.stringify(oauthParams)).toString('base64url'),
    }),
  });
  const { redirect_to } = await verifyRes.json();
  const code = new URL(redirect_to).searchParams.get('code');
  console.log('3. Auth code:', code);

  // Token
  const tokenRes = await fetch(`${BASE}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://chatgpt.com/connector/oauth/',
      client_id: reg.client_id,
      code_verifier: verifier,
    }),
  });
  const tokenData = await tokenRes.json();
  const access_token = tokenData.access_token;
  console.log('4. Token:', access_token.slice(0, 40) + '...');

  // Decode JWT
  const payload = JSON.parse(Buffer.from(access_token.split('.')[1], 'base64url').toString());
  console.log('5. JWT payload:', JSON.stringify(payload, null, 2));

  // Raw fetch test
  console.log('\n6. Raw POST to /api/mcp with Bearer token...');
  const rawRes = await fetch(`${BASE}/api/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${access_token}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } },
      id: 1,
    }),
  });
  const rawText = await rawRes.text();
  console.log('   Status:', rawRes.status);
  console.log('   Body:', rawText.slice(0, 500));
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
