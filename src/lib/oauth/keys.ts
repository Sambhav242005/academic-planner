import { exportJWK, importPKCS8 } from 'jose'
import { createHash } from 'crypto'

const ALG = 'RS256'
const KID = 'academic-planner-1'

let cachedPrivateKey: CryptoKey | null = null
let cachedJwks: { keys: object[] } | null = null

async function getPrivateKeyPem(): Promise<string> {
  const pem = process.env.OAUTH_PRIVATE_KEY
  if (!pem) {
    throw new Error(
      'OAUTH_PRIVATE_KEY not set. Generate one with: ' +
      'node -e "require(\'crypto\').generateKeyPair(\'rsa\',{modularLength:2048},(e,k)=>{if(e)throw e;require(\'fs\').writeFileSync(\'private.pem\',k.privateKey.export({type:\'pkcs8\',format:\'pem\'}));console.log(\'Done\')})"'
    )
  }
  // Handle literal \n from env files (they don't interpret escape sequences)
  return pem.replace(/\\n/g, '\n')
}

export async function getSigningKey(): Promise<CryptoKey> {
  if (cachedPrivateKey) return cachedPrivateKey
  const pem = await getPrivateKeyPem()
  cachedPrivateKey = await importPKCS8(pem, ALG)
  return cachedPrivateKey
}

export async function getJwks(): Promise<{ keys: object[] }> {
  if (cachedJwks) return cachedJwks
  const pem = await getPrivateKeyPem()
  const privateKey = await importPKCS8(pem, ALG)
  const jwk = await exportJWK(privateKey)
  cachedJwks = {
    keys: [
      {
        ...jwk,
        kid: KID,
        alg: ALG,
        use: 'sig',
      },
    ],
  }
  return cachedJwks
}

export async function getKid(): Promise<string> {
  return KID
}

export async function getPublicKeyThumbprint(): Promise<string> {
  const pem = await getPrivateKeyPem()
  const privateKey = await importPKCS8(pem, ALG)
  const jwk = await exportJWK(privateKey)
  // Remove private fields for thumbprint
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { d, dp, dq, p, q, qi: _qi, ...publicJwk } = jwk
  const sortedKeys = Object.keys(publicJwk).sort() as Array<keyof typeof publicJwk>
  const data = JSON.stringify(
    sortedKeys.reduce((obj, key) => ({ ...obj, [key]: publicJwk[key] }), {} as Record<string, unknown>)
  )
  return createHash('sha256').update(data).digest('base64url')
}
