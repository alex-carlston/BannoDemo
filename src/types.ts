export interface CloudflareBindings {
  CLIENT_ID: string
  CLIENT_SECRET: string
  REDIRECT_URI: string
  ENV_URI: string
  /** AES-GCM key material for KV session encryption (Wrangler secret). */
  SESSION_ENC_SECRET?: string
  /** HMAC key for signed session cookies — must differ from SESSION_ENC_SECRET. */
  COOKIE_SIGNING_SECRET?: string
  ENVIRONMENT?: string
  /** Banno plugin card-face iframe height (px) — must match dashboard Initial height. */
  PLUGIN_INITIAL_HEIGHT?: string
  SESSIONS_KV?: KVNamespace
  GOALS_DB?: D1Database
  ASSETS?: Fetcher
}

import type { RequestIdVariables } from 'hono/request-id'

export type Variables = RequestIdVariables & {
  sessionId?: string
  userId?: string
  accessToken?: string
}

export type HonoEnv = {
  Bindings: CloudflareBindings
  Variables: Variables
}

export interface LayoutProps {
  children?: unknown
  title?: string
  activeTab?: string
  userName?: string
  landing?: boolean
  /** Rendered inside Banno iframe webview */
  embed?: boolean
  /** Card-face height from PLUGIN_INITIAL_HEIGHT / Banno plugin config */
  pluginHeight?: number
}

export interface BannoUser {
  id: string
  firstName?: string
  lastName?: string
  email?: string
  username?: string
  phoneNumber?: string
}

export interface BannoAccount {
  id: string
  name: string
  numbers?: string
  accountType?: string
  accountSubType?: string
  balance?: string
  availableBalance?: string
  interestRate?: string
  routingNumber?: string
}

export interface BannoTransaction {
  id: string
  accountId: string
  amount: string
  description?: string
  memo?: string
  date?: string
  type?: string
  checkNumber?: string
  runningBalance?: string
}

export interface BannoDocument {
  id: string
  name?: string
  title?: string
  type?: string
  createdAt?: string
  accountId?: string
}

export interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  accountId?: string
  createdAt: string
}

export interface SpendingCategory {
  category: string
  amount: number
  percentage: number
  color: string
}

export interface DashboardData {
  user: BannoUser | null
  accounts: BannoAccount[]
  transactions: BannoTransaction[]
  documents: BannoDocument[]
  goals: SavingsGoal[]
  netWorth: number
  totalAvailable: number
  healthScore: number
  spendingCategories: SpendingCategory[]
  errors: string[]
}
