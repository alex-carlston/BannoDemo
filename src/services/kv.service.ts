export class KVService {
  private kv: KVNamespace
  private secrets: string[] = []
  private derivedKeys = new Map<string, CryptoKey>()
  private requireSecret: boolean

  constructor(
    kvNamespace: KVNamespace,
    secret?: string | string[],
    options?: { requireSecret?: boolean }
  ) {
    this.kv = kvNamespace
    if (Array.isArray(secret)) {
      this.secrets = secret.filter(Boolean)
    } else if (secret) {
      this.secrets = [secret]
    }
    this.requireSecret = options?.requireSecret ?? true
    if (this.requireSecret && this.secrets.length === 0) {
      throw new Error('KV encryption required but no SESSION_ENC_SECRET provided')
    }
  }

  private async getKey(secret: string): Promise<CryptoKey> {
    const cached = this.derivedKeys.get(secret)
    if (cached) return cached
    const enc = new TextEncoder()
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(secret))
    const key = await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, [
      'encrypt',
      'decrypt',
    ])
    this.derivedKeys.set(secret, key)
    return key
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  }

  private base64ToArrayBuffer(b64: string): ArrayBuffer {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer
  }

  async put(key: string, value: unknown, expirationTtl?: number): Promise<void> {
    let dataToStore = JSON.stringify(value)
    if (this.secrets.length > 0) {
      const keyObj = await this.getKey(this.secrets[0])
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        keyObj,
        new TextEncoder().encode(dataToStore)
      )
      dataToStore = `${this.arrayBufferToBase64(iv.buffer)}:${this.arrayBufferToBase64(ciphertext)}`
    }
    await this.kv.put(key, dataToStore, { expiration: expirationTtl })
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.kv.get(key)
    if (!value) return null

    if (this.secrets.length === 0) {
      if (this.requireSecret) return null
      try {
        return JSON.parse(value) as T
      } catch {
        return null
      }
    }

    for (const secret of this.secrets) {
      try {
        const parts = value.split(':')
        if (parts.length !== 2) continue
        const iv = this.base64ToArrayBuffer(parts[0])
        const ciphertext = this.base64ToArrayBuffer(parts[1])
        const keyObj = await this.getKey(secret)
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: new Uint8Array(iv) },
          keyObj,
          ciphertext
        )
        return JSON.parse(new TextDecoder().decode(decrypted)) as T
      } catch {
        continue
      }
    }

    // Never fall back to plaintext when encryption is configured
    return null
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key)
  }
}

export default KVService
