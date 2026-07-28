import type { DashboardData } from '../types'
import {
  formatCurrency,
  formatDate,
  maskAccountNumber,
  accountIcon,
  categorizeTransaction,
  categoryColor,
} from '../utils/format'

export function DashboardView({ data }: { data: DashboardData }) {
  const recentTx = data.transactions.slice(0, 5)
  return (
    <div class="view-grid">
      {data.errors.length > 0 && (
        <div class="alert alert-warning full-width">
          <p>Some financial data could not be loaded. Please refresh or try again later.</p>
        </div>
      )}

      <section class="hero-stats full-width">
        <div class="stat-card hero">
          <span class="stat-label">Net Worth</span>
          <span class="stat-value">{formatCurrency(data.netWorth)}</span>
          <span class="stat-meta">{data.accounts.length} linked accounts</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Available</span>
          <span class="stat-value accent">{formatCurrency(data.totalAvailable)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Health Score</span>
          <div class="health-ring" style={`--score: ${data.healthScore}`}>
            <span class="health-value">{data.healthScore}</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-label">Goals</span>
          <span class="stat-value">{data.goals.length}</span>
          <span class="stat-meta">active savings goals</span>
        </div>
      </section>

      <section class="panel">
        <h2 class="panel-title">Recent Activity</h2>
        {recentTx.length > 0 ? (
          <ul class="tx-list compact">
            {recentTx.map((tx) => (
              <li key={tx.id} class="tx-item">
                <div class="tx-info">
                  <span class="tx-desc">{tx.description || tx.memo || 'Transaction'}</span>
                  <span class="tx-date">{formatDate(tx.date)}</span>
                </div>
                <span class={`tx-amount ${parseFloat(tx.amount ?? '0') >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(tx.amount ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p class="empty-state">No recent transactions</p>
        )}
        <a href="/callback/plugin?tab=transactions" class="panel-link">
          View all activity →
        </a>
      </section>

      <section class="panel">
        <h2 class="panel-title">Top Spending</h2>
        {data.spendingCategories.length > 0 ? (
          <div class="category-bars">
            {data.spendingCategories.slice(0, 4).map((cat) => (
              <div key={cat.category} class="category-row">
                <div class="category-header">
                  <span>{cat.category}</span>
                  <span>{formatCurrency(cat.amount)}</span>
                </div>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    style={`width: ${cat.percentage}%; background: ${cat.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p class="empty-state">Spending insights appear after transactions load</p>
        )}
      </section>

      <section class="panel full-width">
        <h2 class="panel-title">Account Snapshot</h2>
        <div class="account-grid">
          {data.accounts.slice(0, 4).map((acc) => (
            <div key={acc.id} class="account-tile">
              <div class="account-icon">{accountIcon(acc.accountSubType)}</div>
              <div class="account-details">
                <span class="account-name">{acc.name?.trim()}</span>
                <span class="account-number">{maskAccountNumber(acc.numbers)}</span>
              </div>
              <span class="account-balance">{formatCurrency(acc.balance ?? 0)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export function AccountsView({ data }: { data: DashboardData }) {
  return (
    <div class="view-grid">
      <section class="panel full-width">
        <h2 class="panel-title">Your Accounts</h2>
        <div class="accounts-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Type</th>
                <th>Number</th>
                <th>Balance</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.map((acc) => (
                <tr key={acc.id}>
                  <td>
                    <div class="cell-with-icon">
                      <span class="account-icon-sm">{accountIcon(acc.accountSubType)}</span>
                      {acc.name?.trim()}
                    </div>
                  </td>
                  <td>
                    <span class="badge">{acc.accountSubType || acc.accountType}</span>
                  </td>
                  <td>
                    <code>{maskAccountNumber(acc.numbers)}</code>
                  </td>
                  <td class="amount">{formatCurrency(acc.balance ?? 0)}</td>
                  <td class="amount accent">{formatCurrency(acc.availableBalance ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.accounts.length === 0 && <p class="empty-state">No accounts found</p>}
        </div>
      </section>
    </div>
  )
}

export function TransactionsView({ data }: { data: DashboardData }) {
  return (
    <div class="view-grid">
      <section class="panel full-width">
        <h2 class="panel-title">Transaction History</h2>
        <p class="panel-subtitle">{data.transactions.length} transactions across your accounts</p>
        <div class="accounts-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((tx) => {
                const category = categorizeTransaction(tx.description, tx.memo)
                return (
                  <tr key={tx.id}>
                    <td class="date-cell">{formatDate(tx.date)}</td>
                    <td>
                      <span class="tx-desc-full">{tx.description || tx.memo || '—'}</span>
                      {tx.checkNumber && <span class="tx-check">Check #{tx.checkNumber}</span>}
                    </td>
                    <td>
                      <span class="category-pill" style={`--pill-color: ${categoryColor(category)}`}>
                        {category}
                      </span>
                    </td>
                    <td class={`amount ${parseFloat(tx.amount ?? '0') >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(tx.amount ?? 0)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {data.transactions.length === 0 && (
            <p class="empty-state">No transactions available. Ensure the transactions scope is granted.</p>
          )}
        </div>
      </section>
    </div>
  )
}

export function InsightsView({ data }: { data: DashboardData }) {
  return (
    <div class="view-grid">
      <section class="panel">
        <h2 class="panel-title">Financial Health</h2>
        <div class="health-detail">
          <div class="health-ring large" style={`--score: ${data.healthScore}`}>
            <span class="health-value">{data.healthScore}</span>
          </div>
          <p class="health-desc">
            Your score reflects account diversity, savings presence, and overall balance health.
          </p>
        </div>
      </section>

      <section class="panel">
        <h2 class="panel-title">Spending Breakdown</h2>
        {data.spendingCategories.length > 0 ? (
          <div class="donut-legend">
            {data.spendingCategories.map((cat) => (
              <div key={cat.category} class="legend-item">
                <span class="legend-dot" style={`background: ${cat.color}`} />
                <span class="legend-label">{cat.category}</span>
                <span class="legend-value">{cat.percentage}%</span>
                <span class="legend-amount">{formatCurrency(cat.amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p class="empty-state">Not enough transaction data for insights</p>
        )}
      </section>

      <section class="panel full-width">
        <h2 class="panel-title">Portfolio Summary</h2>
        <div class="portfolio-grid">
          <div class="portfolio-stat">
            <span class="portfolio-label">Total Assets</span>
            <span class="portfolio-value">{formatCurrency(data.netWorth)}</span>
          </div>
          <div class="portfolio-stat">
            <span class="portfolio-label">Liquid Available</span>
            <span class="portfolio-value accent">{formatCurrency(data.totalAvailable)}</span>
          </div>
          <div class="portfolio-stat">
            <span class="portfolio-label">Account Types</span>
            <span class="portfolio-value">
              {new Set(data.accounts.map((a) => a.accountSubType)).size}
            </span>
          </div>
          <div class="portfolio-stat">
            <span class="portfolio-label">30-Day Transactions</span>
            <span class="portfolio-value">{data.transactions.length}</span>
          </div>
        </div>
      </section>
    </div>
  )
}

export function GoalsView({ data }: { data: DashboardData }) {
  return (
    <div class="view-grid">
      <section class="panel full-width">
        <h2 class="panel-title">Savings Goals</h2>
        <p class="panel-subtitle">Track progress toward your financial milestones</p>

        <form method="post" action="/api/goals" class="goal-form">
          <input type="text" name="name" placeholder="Goal name (e.g. Emergency Fund)" required class="input" maxlength={100} />
          <input type="number" name="targetAmount" placeholder="Target amount" required min={1} max={1000000000000} step="0.01" class="input" />
          <input type="number" name="currentAmount" placeholder="Current amount" min={0} max={1000000000000} step="0.01" defaultValue="0" class="input" />
          <button type="submit" class="btn btn-primary">Add Goal</button>
        </form>

        <div class="goals-grid">
          {data.goals.map((goal) => {
            const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
            return (
              <div key={goal.id} class="goal-card">
                <div class="goal-header">
                  <h3>{goal.name}</h3>
                  <form method="post" action={`/api/goals/${goal.id}/delete`} class="inline-form">
                    <button type="submit" class="btn-icon" title="Remove goal" aria-label="Remove goal">
                      ×
                    </button>
                  </form>
                </div>
                <div class="goal-progress">
                  <div class="goal-bar" style={`width: ${progress}%`} />
                </div>
                <div class="goal-amounts">
                  <span>{formatCurrency(goal.currentAmount)}</span>
                  <span class="goal-target">of {formatCurrency(goal.targetAmount)}</span>
                </div>
                <span class="goal-percent">{Math.round(progress)}% complete</span>
              </div>
            )
          })}
        </div>
        {data.goals.length === 0 && (
          <p class="empty-state">No goals yet — create your first savings goal above</p>
        )}
      </section>
    </div>
  )
}

export function DocumentsView({ data }: { data: DashboardData }) {
  return (
    <div class="view-grid">
      <section class="panel full-width">
        <h2 class="panel-title">Documents</h2>
        <p class="panel-subtitle">Statements and documents from your financial institution</p>
        <div class="doc-list">
          {data.documents.map((doc) => (
            <div key={doc.id} class="doc-item">
              <div class="doc-icon">▣</div>
              <div class="doc-info">
                <span class="doc-name">{doc.title || doc.name || 'Document'}</span>
                <span class="doc-meta">
                  {doc.type && <span class="badge">{doc.type}</span>}
                  {doc.createdAt && <span>{formatDate(doc.createdAt)}</span>}
                </span>
              </div>
            </div>
          ))}
        </div>
        {data.documents.length === 0 && (
          <p class="empty-state">
            No documents available. Ensure the documents.readonly scope is granted in Banno People.
          </p>
        )}
      </section>
    </div>
  )
}