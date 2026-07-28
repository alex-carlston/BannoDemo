export function formatCurrency(amount: number | string, currency = 'USD'): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  if (Number.isNaN(value)) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function maskAccountNumber(numbers?: string): string {
  if (!numbers) return '••••'
  const digits = numbers.replace(/\D/g, '')
  return `••••${digits.slice(-4)}`
}

export function accountIcon(subType?: string): string {
  const type = (subType ?? '').toLowerCase()
  if (type.includes('saving')) return 'piggy-bank'
  if (type.includes('check')) return 'wallet'
  if (type.includes('credit') || type.includes('loan')) return 'credit-card'
  if (type.includes('invest')) return 'chart-line'
  return 'landmark'
}

export function categorizeTransaction(description?: string, memo?: string): string {
  const text = `${description ?? ''} ${memo ?? ''}`.toLowerCase()
  if (/grocery|walmart|target|costco|kroger|safeway|whole foods/.test(text)) return 'Groceries'
  if (/restaurant|cafe|coffee|starbucks|mcdonald|doordash|uber eats|grubhub/.test(text)) return 'Dining'
  if (/gas|shell|chevron|exxon|bp |fuel/.test(text)) return 'Transportation'
  if (/amazon|ebay|shop|store|retail/.test(text)) return 'Shopping'
  if (/netflix|spotify|hulu|disney|subscription/.test(text)) return 'Subscriptions'
  if (/electric|water|utility|internet|comcast|at&t|verizon/.test(text)) return 'Utilities'
  if (/payroll|salary|deposit|direct dep/.test(text)) return 'Income'
  if (/transfer|xfer/.test(text)) return 'Transfers'
  if (/atm|withdraw/.test(text)) return 'Cash'
  return 'Other'
}

const CATEGORY_COLORS: Record<string, string> = {
  Groceries: '#10b981',
  Dining: '#f59e0b',
  Transportation: '#3b82f6',
  Shopping: '#8b5cf6',
  Subscriptions: '#ec4899',
  Utilities: '#06b6d4',
  Income: '#22c55e',
  Transfers: '#64748b',
  Cash: '#94a3b8',
  Other: '#cbd5e1',
}

const CATEGORY_SLUGS: Record<string, string> = {
  Groceries: 'groceries',
  Dining: 'dining',
  Transportation: 'transportation',
  Shopping: 'shopping',
  Subscriptions: 'subscriptions',
  Utilities: 'utilities',
  Income: 'income',
  Transfers: 'transfers',
  Cash: 'cash',
  Other: 'other',
}

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other
}

/** CSS class suffix for category color (no inline styles). */
export function categorySlug(category: string): string {
  return CATEGORY_SLUGS[category] ?? 'other'
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function computeHealthScore(accounts: { balance?: string; accountSubType?: string }[]): number {
  if (accounts.length === 0) return 50
  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance ?? '0'), 0)
  const savingsCount = accounts.filter((a) =>
    (a.accountSubType ?? '').toLowerCase().includes('saving')
  ).length
  const hasPositiveBalance = totalBalance > 0
  const diversity = Math.min(accounts.length * 10, 30)
  const savingsBonus = savingsCount > 0 ? 20 : 0
  const balanceScore = hasPositiveBalance ? Math.min(Math.log10(Math.max(totalBalance, 1)) * 15, 40) : 0
  return Math.min(Math.round(30 + diversity + savingsBonus + balanceScore), 100)
}
