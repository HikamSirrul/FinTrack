
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getDashboardSummary } from './services/dashboard'
import type { DashboardSummary } from './types/dashboard'
import AccountsPage from './pages/AccountsPage'
import CategoriesPage from './pages/CategoriesPage'
import TransactionsPage from './pages/TransactionsPage'
import RegisterPage from './pages/Register'
import LoginPage from './pages/Login'
import HomePage from './pages/Home'
import PublicNavbar from './components/PublicNavbar'
import api from './lib/api'

type DashboardAccount = {
  id: string
  name: string
  type: 'CASH' | 'BANK' | 'E_WALLET' | 'OTHER'
  initialBalance: number | string
  currentBalance: number | string
}

type CardProps = {
  id?: string
  className?: string
  title?: string
  children: ReactNode
}

function Card({
  id,
  className = '',
  title,
  children,
}: CardProps) {
  return (
    <section
      id={id}
      className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {title}
        </h2>
      )}

      {children}
    </section>
  )
}

type SectionTitleProps = {
  title: string
  subtitle: string
}

function SectionTitle({
  title,
  subtitle,
}: SectionTitleProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">
        {title}
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        {subtitle}
      </p>
    </div>
  )
}

type StatCardProps = {
  title: string
  value: number
  description: string
  symbol: string
  symbolClass: string
}

function StatCard({
  title,
  value,
  description,
  symbol,
  symbolClass,
}: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900">
            {formatCurrency(value)}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${symbolClass}`}
        >
          {symbol}
        </div>
      </div>
    </Card>
  )
}

function formatCurrency(value: number | string) {
  const amount = Number(value)

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0)
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatTransactionType(type: string) {
  switch (type) {
    case 'INCOME':
      return 'Pemasukan'
    case 'EXPENSE':
      return 'Pengeluaran'
    case 'TRANSFER':
      return 'Transfer'
    default:
      return type
  }
}

function getTransactionStyle(type: string) {
  switch (type) {
    case 'INCOME':
      return 'bg-emerald-50 text-emerald-700'
    case 'EXPENSE':
      return 'bg-rose-50 text-rose-700'
    case 'TRANSFER':
      return 'bg-blue-50 text-blue-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function getTransactionAmount(
  type: string,
  amount: number | string,
) {
  const value = Number(amount)
  const safeValue = Number.isFinite(value) ? value : 0

  if (type === 'INCOME') {
    return `+ ${formatCurrency(safeValue)}`
  }

  if (type === 'EXPENSE') {
    return `- ${formatCurrency(safeValue)}`
  }

  return formatCurrency(safeValue)
}

function ProgressBar({
  percentage,
  color,
}: {
  percentage: number
  color?: string
}) {
  const safePercentage = Number.isFinite(percentage)
    ? Math.min(100, Math.max(0, percentage))
    : 0

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuenow={Math.round(safePercentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Persentase progres"
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${safePercentage}%`,
          backgroundColor: color || '#4f46e5',
        }}
      />
    </div>
  )
}

function App() {
  const [summary, setSummary] =
    useState<DashboardSummary | null>(null)

  const [accounts, setAccounts] =
    useState<DashboardAccount[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Status autentikasi pengguna.
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [authPage, setAuthPage] = useState<
  'home' | 'login' | 'register'
>('home')

  const [currentPage, setCurrentPage] = useState<
    'dashboard' | 'accounts' | 'categories' | 'transactions'
  >('dashboard')

  /**
   * Memuat ulang ringkasan Dashboard dan saldo setiap akun.
   * Fungsi ini juga dipanggil setelah transaksi atau transfer berubah.
   */
  const refreshDashboard = useCallback(async () => {
    try {
      const [dashboardData, accountsResponse] =
        await Promise.all([
          getDashboardSummary(),
          api.get('/accounts'),
        ])

      const accountData = accountsResponse.data?.accounts

      setSummary(dashboardData)

      setAccounts(
        Array.isArray(accountData) ? accountData : [],
      )

      setError('')
    } catch (refreshError) {
      console.error(
        'Gagal memperbarui data Dashboard:',
        refreshError,
      )

      setError(
        'Data dashboard gagal dimuat. Periksa koneksi backend dan status login Anda.',
      )
    }
  }, [])

  /**
   * Memeriksa token saat aplikasi pertama kali dibuka.
   * Dashboard hanya dimuat jika token masih valid.
   */
  useEffect(() => {
    let active = true

    async function initializeApp() {
      const token = localStorage.getItem('fintrack_token')

      if (!token) {
        if (active) {
          setAuthLoading(false)
          setLoading(false)
        }
        return
      }

      try {
        await api.get('/auth/me')

        if (!active) return

        setIsAuthenticated(true)
        await refreshDashboard()
      } catch (authError) {
        console.error('Gagal memeriksa sesi autentikasi:', authError)

        const status = (
          authError as { response?: { status?: number } }
        ).response?.status

        // Token hanya dihapus jika server menyatakan token tidak valid.
        if (status === 401 || status === 403) {
          localStorage.removeItem('fintrack_token')
        }

        if (active) {
          setIsAuthenticated(false)
          setError('')
        }
      } finally {
        if (active) {
          setAuthLoading(false)
          setLoading(false)
        }
      }
    }

    void initializeApp()

    return () => {
      active = false
    }
  }, [refreshDashboard])

  /**
   * Dipanggil setelah login atau registrasi berhasil.
   */
  const handleAuthSuccess = async () => {
    setIsAuthenticated(true)
    setError('')
    setLoading(true)

    await refreshDashboard()

    setLoading(false)
  }

  /**
   * Mengakhiri sesi pengguna dan menghapus token lokal.
   */
  const handleLogout = () => {
    localStorage.removeItem('fintrack_token')
    setIsAuthenticated(false)
    setAuthPage('home')
    setCurrentPage('dashboard')
    setSummary(null)
    setAccounts([])
    setError('')
    setLoading(false)
  }

   if (!isAuthenticated) {
  return (
    <>
      <PublicNavbar
        activePage={authPage}
        onHome={() => setAuthPage('home')}
        onLogin={() => setAuthPage('login')}
        onRegister={() => setAuthPage('register')}
      />

      {authPage === 'register' ? (
        <RegisterPage
          onSwitchToLogin={() => setAuthPage('login')}
          onRegisterSuccess={handleAuthSuccess}
        />
      ) : authPage === 'login' ? (
        <LoginPage
          onSwitchToRegister={() => setAuthPage('register')}
          onLoginSuccess={handleAuthSuccess}
        />
      ) : (
        <HomePage
          onLogin={() => setAuthPage('login')}
          onRegister={() => setAuthPage('register')}
        />
      )}
    </>
  )
}

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">
          Memeriksa sesi pengguna...
        </p>
      </div>
    )
  }

  if (!isAuthenticated) {
  if (authPage === 'register') {
    return (
      <RegisterPage
        onSwitchToLogin={() => setAuthPage('login')}
        onRegisterSuccess={handleAuthSuccess}
      />
    )
  }

  if (authPage === 'login') {
    return (
      <LoginPage
        onSwitchToRegister={() => setAuthPage('register')}
        onLoginSuccess={handleAuthSuccess}
      />
    )
  }

  return (
    <HomePage
      onLogin={() => setAuthPage('login')}
      onRegister={() => setAuthPage('register')}
    />
  )
}
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">
          Memuat dashboard...
        </p>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold">
            Dashboard belum tersedia
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            {error || 'Data dashboard belum tersedia.'}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    )
  }

  if (currentPage === 'accounts') {
    return (
      <AccountsPage
        onBack={() => setCurrentPage('dashboard')}
      />
    )
  }

  if (currentPage === 'categories') {
    return (
      <CategoriesPage
        onBack={() => setCurrentPage('dashboard')}
      />
    )
  }

  if (currentPage === 'transactions') {
    return (
      <TransactionsPage
        onBack={() => setCurrentPage('dashboard')}
        onDataChanged={refreshDashboard}
      />
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentPage('accounts')}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <span aria-hidden="true">▤</span>
              Akun Keuangan
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage('categories')}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <span aria-hidden="true">▦</span>
              Kategori Transaksi
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage('transactions')}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
            >
              <span aria-hidden="true">↔</span>
              Transaksi
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Ringkasan keuangan
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50"
            >
              Keluar
            </button>
          </div>
        </header>

        {/* Summary cards */}
        <section
          aria-label="Ringkasan keuangan"
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <StatCard
            title="Total saldo"
            value={summary.totalBalance}
            description="Akumulasi saldo seluruh akun"
            symbol="Rp"
            symbolClass="bg-indigo-50 text-indigo-700"
          />

          <StatCard
            title="Total pemasukan"
            value={summary.totalIncome}
            description="Pemasukan bulan ini"
            symbol="+"
            symbolClass="bg-emerald-50 text-emerald-700"
          />

          <StatCard
            title="Total pengeluaran"
            value={summary.totalExpense}
            description="Pengeluaran bulan ini"
            symbol="−"
            symbolClass="bg-rose-50 text-rose-700"
          />

          <StatCard
            title="Arus kas bersih"
            value={summary.monthlyCashFlow}
            description="Pemasukan dikurangi pengeluaran"
            symbol="↗"
            symbolClass="bg-blue-50 text-blue-700"
          />
        </section>

        {/* Account balances */}
        <section className="mb-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Saldo setiap akun
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Saldo terkini seluruh rekening, uang tunai, dan e-wallet Anda.
              </p>
            </div>

            <span className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
              {accounts.length} akun
            </span>
          </div>

          {accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
              <div className="text-3xl">💳</div>

              <p className="mt-3 font-semibold text-slate-800">
                Belum ada akun
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Tambahkan akun untuk melihat saldo di Dashboard.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {accounts.map((account) => {
                const accountTypeLabels: Record<
                  DashboardAccount['type'],
                  string
                > = {
                  CASH: 'Uang tunai',
                  BANK: 'Rekening bank',
                  E_WALLET: 'E-wallet',
                  OTHER: 'Lainnya',
                }

                const accountTypeIcons: Record<
                  DashboardAccount['type'],
                  string
                > = {
                  CASH: '💵',
                  BANK: '🏦',
                  E_WALLET: '📱',
                  OTHER: '💳',
                }

                return (
                  <article
                    key={account.id}
                    className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-2xl">
                          {accountTypeIcons[account.type] ?? '💳'}
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-slate-900">
                            {account.name}
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            {accountTypeLabels[account.type] ?? 'Lainnya'}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                        Aktif
                      </span>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-4">
                      <p className="text-sm text-slate-500">
                        Saldo saat ini
                      </p>

                      <p className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-900">
                        {formatCurrency(account.currentBalance)}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {/* Budget and transactions */}
        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-5">
          <Card id="budgets" className="xl:col-span-3">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <SectionTitle
                title="Anggaran bulanan"
                subtitle="Pantau penggunaan anggaran setiap kategori"
              />

              <span className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
                {summary.budgets.length} kategori
              </span>
            </div>

            {summary.budgets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
                <p className="font-medium text-slate-700">
                  Belum ada anggaran
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Anggaran yang sudah dibuat akan muncul di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {summary.budgets.map((budget) => (
                  <div key={budget.id}>
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{
                            backgroundColor: budget.category.color,
                          }}
                        />

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {budget.category.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Terpakai {budget.percentage.toFixed(0)}%
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-slate-800">
                          {formatCurrency(budget.spentAmount)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          dari {formatCurrency(budget.budgetAmount)}
                        </p>
                      </div>
                    </div>

                    <ProgressBar
                      percentage={budget.percentage}
                      color={budget.category.color}
                    />

                    <p className="mt-2 text-xs text-slate-500">
                      Sisa anggaran:{' '}
                      <span className="font-medium text-slate-700">
                        {formatCurrency(budget.remainingAmount)}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card id="transactions" className="xl:col-span-2">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <SectionTitle
                title="Transaksi terbaru"
                subtitle="Lima transaksi terakhir"
              />
            </div>

            {summary.recentTransactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
                <p className="font-medium text-slate-700">
                  Belum ada transaksi
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Transaksi terbaru akan muncul di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {summary.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                        {transaction.type === 'INCOME'
                          ? '+'
                          : transaction.type === 'EXPENSE'
                            ? '−'
                            : '↔'}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {transaction.description ||
                            transaction.category?.name ||
                            formatTransactionType(transaction.type)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(transaction.date)}
                        </p>

                        {transaction.account && (
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {transaction.account.name}
                          </p>
                        )}

                        <span
                          className={`mt-2 inline-flex rounded-md px-2 py-1 text-xs font-medium ${getTransactionStyle(transaction.type)}`}
                        >
                          {formatTransactionType(transaction.type)}
                        </span>
                      </div>
                    </div>

                    <p
                      className={`shrink-0 text-right text-sm font-semibold ${
                        transaction.type === 'INCOME'
                          ? 'text-emerald-600'
                          : transaction.type === 'EXPENSE'
                            ? 'text-rose-600'
                            : 'text-slate-700'
                      }`}
                    >
                      {getTransactionAmount(
                        transaction.type,
                        transaction.amount,
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* Savings goals */}
        <section>
          <Card id="savings">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <SectionTitle
                title="Sasaran tabungan"
                subtitle="Pantau perkembangan target finansialmu"
              />

              <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                {summary.savingsGoals.length} sasaran
              </span>
            </div>

            {summary.savingsGoals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
                <p className="font-medium text-slate-700">
                  Belum ada sasaran tabungan
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Sasaran tabungan yang dibuat akan ditampilkan di sini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {summary.savingsGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="rounded-xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:shadow-sm"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-700">
                          ↗
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-slate-800">
                            {goal.name}
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            {goal.deadline
                              ? `Target ${formatDate(goal.deadline)}`
                              : 'Tanpa batas waktu'}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                        {goal.percentage.toFixed(0)}%
                      </span>
                    </div>

                    <ProgressBar
                      percentage={goal.percentage}
                      color="#059669"
                    />

                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500">
                          Terkumpul
                        </p>

                        <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                          {formatCurrency(goal.currentAmount)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-slate-500">
                          Target
                        </p>

                        <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                          {formatCurrency(goal.targetAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">
                        Sisa untuk mencapai target
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {formatCurrency(goal.remainingAmount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* Footer */}
        <footer className="mt-8 border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
          FinTrack · Personal Finance Management
        </footer>
      </div>
    </main>
  )
}

export default App
