import type {
  BannoAccount,
  BannoDocument,
  BannoTransaction,
  BannoUser,
  CloudflareBindings,
  SavingsGoal,
  SpendingCategory,
} from '../types'
import { categorizeTransaction, categoryColor, computeHealthScore } from '../utils/format'
import { GoalsService } from './goals.service'

export class BannoApiService {
  private baseUrl: string
  private accessToken: string

  constructor(env: CloudflareBindings, accessToken: string) {
    this.baseUrl = env.ENV_URI.replace(/\/$/, '')
    this.accessToken = accessToken
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
      },
    })
    if (!response.ok) {
      console.error('Banno API error', { path, status: response.status })
      throw new Error(`upstream_${response.status}`)
    }
    return response.json()
  }

  async getUser(userId: string): Promise<BannoUser> {
    return this.fetchJson<BannoUser>(`/a/consumer/api/v0/users/${userId}`)
  }

  async getAccounts(userId: string): Promise<BannoAccount[]> {
    const data = await this.fetchJson<BannoAccount[] | { accounts: BannoAccount[] }>(
      `/a/consumer/api/v0/users/${userId}/accounts`
    )
    return Array.isArray(data) ? data : (data.accounts ?? [])
  }

  async getTransactions(userId: string, accountId: string): Promise<BannoTransaction[]> {
    const data = await this.fetchJson<BannoTransaction[] | { transactions: BannoTransaction[] }>(
      `/a/consumer/api/v0/users/${userId}/accounts/${accountId}/transactions`
    )
    const txs = Array.isArray(data) ? data : (data.transactions ?? [])
    return txs.map((tx) => ({ ...tx, accountId }))
  }

  async getDocuments(userId: string): Promise<BannoDocument[]> {
    try {
      const data = await this.fetchJson<BannoDocument[] | { documents: BannoDocument[] }>(
        `/a/consumer/api/v0/users/${userId}/documents`
      )
      return Array.isArray(data) ? data : (data.documents ?? [])
    } catch {
      return []
    }
  }
}

export function buildSpendingCategories(transactions: BannoTransaction[]): SpendingCategory[] {
  const totals = new Map<string, number>()
  for (const tx of transactions) {
    const amount = Math.abs(parseFloat(tx.amount ?? '0'))
    if (amount === 0) continue
    const category = categorizeTransaction(tx.description, tx.memo)
    totals.set(category, (totals.get(category) ?? 0) + amount)
  }
  const grandTotal = Array.from(totals.values()).reduce((a, b) => a + b, 0) || 1
  return Array.from(totals.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: Math.round((amount / grandTotal) * 100),
      color: categoryColor(category),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)
}

export async function loadDashboardData(
  env: CloudflareBindings,
  userId: string,
  accessToken: string
): Promise<{
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
}> {
  const api = new BannoApiService(env, accessToken)
  const errors: string[] = []
  let user: BannoUser | null = null
  let accounts: BannoAccount[] = []
  let transactions: BannoTransaction[] = []
  let documents: BannoDocument[] = []
  let goals: SavingsGoal[] = []

  try {
    user = await api.getUser(userId)
  } catch {
    errors.push('profile_unavailable')
  }

  try {
    accounts = await api.getAccounts(userId)
  } catch {
    errors.push('accounts_unavailable')
  }

  const txResults = await Promise.allSettled(
    accounts.slice(0, 5).map((a) => api.getTransactions(userId, a.id))
  )
  for (const result of txResults) {
    if (result.status === 'fulfilled') {
      transactions.push(...result.value.slice(0, 20))
    }
  }
  transactions.sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
  transactions = transactions.slice(0, 50)

  try {
    documents = await api.getDocuments(userId)
  } catch (e) {
    console.warn('Documents fetch failed', e instanceof Error ? e.message : 'unknown')
  }

  if (env.GOALS_DB) {
    try {
      const goalsService = new GoalsService(env.GOALS_DB)
      goals = await goalsService.getGoals(userId)
    } catch {
      errors.push('goals_unavailable')
    }
  }

  const netWorth = accounts.reduce((sum, a) => sum + parseFloat(a.balance ?? '0'), 0)
  const totalAvailable = accounts.reduce((sum, a) => sum + parseFloat(a.availableBalance ?? '0'), 0)
  const healthScore = computeHealthScore(accounts)
  const spendingCategories = buildSpendingCategories(
    transactions.filter((tx) => parseFloat(tx.amount ?? '0') < 0)
  )

  return {
    user,
    accounts,
    transactions,
    documents,
    goals,
    netWorth,
    totalAvailable,
    healthScore,
    spendingCategories,
    errors,
  }
}
