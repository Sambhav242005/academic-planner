import { exportJWK, importPKCS8, importSPKI } from 'jose'
import { createHash, createPrivateKey, createPublicKey } from 'crypto'

const ALG = 'RS256'
const KID = 'academic-planner-1'

let cachedPrivateKey: CryptoKey | null = null
let cachedPublicKey: CryptoKey | null = null
let cachedJwks: { keys: object[] } | null = null

async function getPrivateKeyPem(): Promise<string> {
  const pem = process.env.OAUTH_PRIVATE_KEY
  if (!pem) {
    throw new Error('OAUTH_PRIVATE_KEY not set')
  }
  return pem.replace(/\\n/g, '\n')
}

export async function getSigningKey(): Promise<CryptoKey> {
  if (cachedPrivateKey) return cachedPrivateKey
  const pem = await getPrivateKeyPem()
  cachedPrivateKey = await importPKCS8(pem, ALG, { extractable: true })
  return cachedPrivateKey
}

export async function getVerificationKey(): Promise<CryptoKey> {
  if (cachedPublicKey) return cachedPublicKey
  const privatePem = await getPrivateKeyPem()
  const privateKeyObj = createPrivateKey(privatePem)
  const publicKeyObj = createPublicKey(privateKeyObj)
  const publicPem = publicKeyObj.export({ type: 'spki', format: 'pem' }) as string
  cachedPublicKey = await importSPKI(publicPem, ALG)
  return cachedPublicKey
}

export async function getJwks(): Promise<{ keys: object[] }> {
  if (cachedJwks) return cachedJwks
  const privateKey = await getSigningKey()
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
  const privateKey = await getSigningKey()
  const jwk = await exportJWK(privateKey)
  const { d, dp, dq, p, q, qi: _qi, ...publicJwk } = jwk
  const sortedKeys = Object.keys(publicJwk).sort() as Array<keyof typeof publicJwk>
  const data = JSON.stringify(
    sortedKeys.reduce((obj, key) => ({ ...obj, [key]: publicJwk[key] }), {} as Record<string, unknown>)
  )
  return createHash('sha256').update(data).digest('base64url')
}
