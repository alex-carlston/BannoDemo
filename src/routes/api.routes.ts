import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { timeout } from 'hono/timeout'
import { validator } from 'hono/validator'
import { requireSession } from '../middleware/auth.middleware'
import { GoalsService, MAX_GOALS_PER_USER, MAX_GOAL_AMOUNT } from '../services/goals.service'
import { SAFE_CONFIG_ERROR } from '../utils/errors'
import type { HonoEnv } from '../types'

const GOALS_TAB = '/callback/plugin?tab=goals'
const UUID_RE = /^[0-9a-f-]{36}$/i

const goalsFormValidator = validator('form', (value, c) => {
  const name = String(value.name ?? '').trim().slice(0, 100)
  const targetAmount = parseFloat(String(value.targetAmount ?? '0'))
  const currentAmount = parseFloat(String(value.currentAmount ?? '0'))

  if (
    !name ||
    !Number.isFinite(targetAmount) ||
    !Number.isFinite(currentAmount) ||
    targetAmount <= 0 ||
    targetAmount > MAX_GOAL_AMOUNT ||
    currentAmount < 0 ||
    currentAmount > MAX_GOAL_AMOUNT
  ) {
    return c.redirect(GOALS_TAB)
  }

  return { name, targetAmount, currentAmount }
})

const goalIdParamValidator = validator('param', (value, c) => {
  const id = String(value.id ?? '')
  if (!UUID_RE.test(id)) {
    return c.redirect(GOALS_TAB)
  }
  return { id }
})

export function createApiRoutes(): Hono<HonoEnv> {
  const router = new Hono<HonoEnv>()

  router.use(
    '/api/*',
    timeout(
      15_000,
      () =>
        new HTTPException(408, {
          message: SAFE_CONFIG_ERROR,
        })
    )
  )
  router.use('/api/*', requireSession)

  router.post('/api/goals', goalsFormValidator, async (c) => {
    const userId = c.get('userId')
    if (!userId) return c.redirect('/auth/login')

    const { name, targetAmount, currentAmount } = c.req.valid('form')

    if (!c.env.GOALS_DB) {
      throw new HTTPException(503, { message: SAFE_CONFIG_ERROR })
    }

    const goalsService = new GoalsService(c.env.GOALS_DB)
    const count = await goalsService.countGoals(userId)
    if (count >= MAX_GOALS_PER_USER) {
      return c.redirect(GOALS_TAB)
    }

    await goalsService.addGoal(userId, { name, targetAmount, currentAmount })
    return c.redirect(GOALS_TAB)
  })

  router.post('/api/goals/:id/delete', goalIdParamValidator, async (c) => {
    const userId = c.get('userId')
    if (!userId) return c.redirect('/auth/login')

    const { id: goalId } = c.req.valid('param')

    if (!c.env.GOALS_DB) {
      throw new HTTPException(503, { message: SAFE_CONFIG_ERROR })
    }

    const goalsService = new GoalsService(c.env.GOALS_DB)
    await goalsService.deleteGoal(userId, goalId)
    return c.redirect(GOALS_TAB)
  })

  return router
}
