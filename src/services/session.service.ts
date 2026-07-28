import KVService from './kv.service'
import { refreshAccessToken } from './auth.service'
import type { Bindings } from './auth.service'

/** Absolute session lifetime (seconds). */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30
/** Idle timeout — require re-auth after inactivity (seconds). */
export const SESSION_IDLE_SECONDS = 60 * 30

export interface SessionData {
  userId: string
  accessToken: string
  refreshToken: string
  /** Access token expiry as Unix seconds. */
  expiresAt: number
  /** Last activity as Unix seconds (idle timeout). */
  lastActivityAt: number
}

interface StoredSession {
  userId: string
  accessToken: string
  refreshToken: string
  /** Access token expiry as Unix seconds. */
  expiresAt: number
  lastActivityAt: number
}

export class SessionService {
  private kvService: KVService
  private env: Bindings

  constructor(kvNamespace: KVNamespace, kvEncryptionSecret: string, env: Bindings) {
    this.kvService = new KVService(kvNamespace, kvEncryptionSecret, { requireSecret: true })
    this.env = env
  }

  private sessionExpiryUnix(): number {
    return Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  }

  async createUserSession(sessionId: string, userId: string, data: SessionData): Promise<void> {
    const expiresAt = this.sessionExpiryUnix()
    const existingSessionId = await this.getUserSessionId(userId)
    if (existingSessionId && existingSessionId !== sessionId) {
      await this.deleteSession(existingSessionId)
    }
    const now = Math.floor(Date.now() / 1000)
    await this.kvService.put(
      `session:${sessionId}`,
      {
        userId: data.userId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        lastActivityAt: data.lastActivityAt || now,
      } satisfies StoredSession,
      expiresAt
    )
    await this.kvService.put(`user_session:${userId}`, sessionId, expiresAt)
  }

  async getUserSessionId(userId: string): Promise<string | null> {
    return this.kvService.get<string>(`user_session:${userId}`)
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const kvRes = await this.kvService.get<StoredSession>(`session:${sessionId}`)
    if (!kvRes) return null

    const now = Math.floor(Date.now() / 1000)

    if (kvRes.lastActivityAt && now - kvRes.lastActivityAt > SESSION_IDLE_SECONDS) {
      await this.deleteSession(sessionId)
      return null
    }

    let session: SessionData = {
      userId: kvRes.userId,
      accessToken: kvRes.accessToken,
      refreshToken: kvRes.refreshToken,
      expiresAt: kvRes.expiresAt,
      lastActivityAt: now,
    }

    if (kvRes.expiresAt && kvRes.expiresAt < now) {
      try {
        const tokenResponse = await refreshAccessToken(kvRes.refreshToken, this.env)
        session = {
          userId: kvRes.userId,
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token || kvRes.refreshToken,
          expiresAt: now + (tokenResponse.expires_in || 3600),
          lastActivityAt: now,
        }
      } catch {
        await this.deleteSession(sessionId)
        return null
      }
    }

    await this.updateSession(sessionId, session)
    return session
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.kvService.delete(`session:${sessionId}`)
  }

  async deleteUserSession(userId: string): Promise<void> {
    await this.kvService.delete(`user_session:${userId}`)
  }

  async updateSession(sessionId: string, data: SessionData): Promise<void> {
    const expiresAt = this.sessionExpiryUnix()
    await this.kvService.put(
      `session:${sessionId}`,
      {
        userId: data.userId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        lastActivityAt: data.lastActivityAt || Math.floor(Date.now() / 1000),
      } satisfies StoredSession,
      expiresAt
    )
  }
}
