import type { SavingsGoal } from '../types'

export const MAX_GOALS_PER_USER = 50
export const MAX_GOAL_AMOUNT = 1_000_000_000_000

interface GoalRow {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  account_id: string | null
  created_at: string
  updated_at: string
}

function rowToGoal(row: GoalRow): SavingsGoal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    currentAmount: row.current_amount,
    accountId: row.account_id ?? undefined,
    createdAt: row.created_at,
  }
}

export class GoalsService {
  constructor(private db: D1Database) {}

  async getGoals(userId: string): Promise<SavingsGoal[]> {
    const result = await this.db
      .prepare(
        `SELECT id, user_id, name, target_amount, current_amount, account_id, created_at, updated_at
         FROM savings_goals
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(userId, MAX_GOALS_PER_USER)
      .all<GoalRow>()

    return (result.results ?? []).map(rowToGoal)
  }

  async countGoals(userId: string): Promise<number> {
    const result = await this.db
      .prepare(`SELECT COUNT(*) as count FROM savings_goals WHERE user_id = ?`)
      .bind(userId)
      .first<{ count: number }>()
    return result?.count ?? 0
  }

  async addGoal(
    userId: string,
    goal: Omit<SavingsGoal, 'id' | 'createdAt'>
  ): Promise<SavingsGoal> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newGoal: SavingsGoal = {
      id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      accountId: goal.accountId,
      createdAt: now,
    }

    await this.db
      .prepare(
        `INSERT INTO savings_goals
         (id, user_id, name, target_amount, current_amount, account_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        userId,
        goal.name,
        goal.targetAmount,
        goal.currentAmount,
        goal.accountId ?? null,
        now,
        now
      )
      .run()

    return newGoal
  }

  async deleteGoal(userId: string, goalId: string): Promise<boolean> {
    const result = await this.db
      .prepare(`DELETE FROM savings_goals WHERE id = ? AND user_id = ?`)
      .bind(goalId, userId)
      .run()

    return (result.meta.changes ?? 0) > 0
  }
}
