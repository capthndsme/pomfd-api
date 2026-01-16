import crypto from 'node:crypto'
import env from '#start/env'

type FileSharePayload = {
  v: 1
  fileId: string
  exp: number | null // epoch ms, null = no expiry
}

const base64UrlEncode = (input: string) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')

const base64UrlDecode = (input: string) => {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=')
  return Buffer.from(padded, 'base64').toString('utf8')
}

const timingSafeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

class FileShareTokenService {
  private secret() {
    return env.get('APP_KEY')
  }

  create(fileId: string, expiresInSeconds: number | null): string {
    const exp = expiresInSeconds ? Date.now() + expiresInSeconds * 1000 : null
    const payload: FileSharePayload = { v: 1, fileId, exp }
    const payloadB64 = base64UrlEncode(JSON.stringify(payload))
    const sig = crypto.createHmac('sha256', this.secret()).update(payloadB64).digest('hex')
    return `${payloadB64}.${sig}`
  }

  verify(token: string): FileSharePayload {
    const [payloadB64, sig] = token.split('.')
    if (!payloadB64 || !sig) {
      throw new Error('Invalid token')
    }
    const expected = crypto.createHmac('sha256', this.secret()).update(payloadB64).digest('hex')
    if (!timingSafeEqual(sig, expected)) {
      throw new Error('Invalid token')
    }

    const payload = JSON.parse(base64UrlDecode(payloadB64)) as FileSharePayload
    if (!payload?.fileId || payload.v !== 1) {
      throw new Error('Invalid token')
    }
    if (payload.exp && Date.now() > payload.exp) {
      throw new Error('Token expired')
    }
    return payload
  }
}

export default new FileShareTokenService()

