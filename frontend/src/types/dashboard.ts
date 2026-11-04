
export interface DashboardSummary {
    accounts: DashboardAccount[]
  period: {
    month: number
    year: number
  }
  totalIncome: number
  totalExpense: number
  monthlyCashFlow: number
  totalBalance: number
  budgets: {
    id: string
    category: {
      id: string
      name: string
      color: string
      type: 'INCOME' | 'EXPENSE'
    }
    budgetAmount: number
    spentAmount: number
    remainingAmount: number
    percentage: number
  }[]
  recentTransactions: {
    id: string
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
    amount: number | string
    description: string | null
    date: string
    account?: {
      id: string
      name: string
    } | null
    category?: {
      id: string
      name: string
      color: string
    } | null
  }[]
  savingsGoals: {
    id: string
    name: string
    targetAmount: number
    currentAmount: number
    remainingAmount: number
    percentage: number
    deadline: string | null
  }[]
}

export interface DashboardResponse {
  message: string
  summary: DashboardSummary
}

export type DashboardAccount = {
  id: string
  name: string
  type: 'CASH' | 'BANK' | 'E_WALLET' | 'OTHER'
  initialBalance: number | string
  currentBalance: number | string
}
