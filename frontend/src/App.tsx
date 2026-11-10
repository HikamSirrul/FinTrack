
import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

import { getDashboardSummary } from './services/dashboard'
import type { DashboardSummary } from './types/dashboard'

import AccountsPage from './pages/AccountsPage'
import CategoriesPage from './pages/CategoriesPage'
import TransactionsPage from './pages/TransactionsPage'
import BudgetsPage from './pages/BudgetsPage'
import SavingsGoalsPage from './pages/SavingsGoalsPage'
import RegisterPage from './pages/Register'
import LoginPage from './pages/Login'
import HomePage from './pages/Home'

import PublicNavbar from './components/PublicNavbar'
import DashboardLayout from './components/DashboardLayout'
import api from './lib/api'

type DashboardAccount = {
  id: string
  name: string
  type: 'CASH' | 'BANK' | 'E_WALLET' | 'OTHER'
  initialBalance: number | string
  currentBalance: number | string
}

type Page =
  | 'dashboard'
  | 'accounts'
  | 'categories'
  | 'transactions'
  | 'budgets'
  | 'savings'

type AuthPage = 'home' | 'login' | 'register'

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
    <Card className="border-0 shadow-md shadow-slate-200/60 transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
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


type AutoGridProps = {
  itemCount: number
  children: ReactNode
  className?: string
}

/**
 * Menentukan jumlah kolom berdasarkan jumlah item.
 * Flexbox akan memperlebar item pada baris terakhir agar ruang terisi.
 */
function getGridColumns(itemCount: number) {
  return Math.max(1, Math.ceil(Math.sqrt(itemCount)))
}

function AutoGrid({
  itemCount,
  children,
  className = '',
}: AutoGridProps) {
  return (
    <div
      className={`dashboard-auto-grid ${className}`}
      style={
        {
          '--grid-columns': getGridColumns(itemCount),
        } as CSSProperties
      }
    >
      {children}
    </div>
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
          backgroundColor: color || '#059669',
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

  // Status autentikasi
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState('')
  const [authLoading, setAuthLoading] = useState(true)

  // Halaman publik
  const [authPage, setAuthPage] = useState<AuthPage>('home')

  // Halaman dashboard
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  /**
   * Memuat ulang ringkasan Dashboard dan saldo setiap akun.
   * Dipanggil setelah transaksi atau transfer berubah.
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
        const profileResponse = await api.get('/auth/me')

        if (!active) return

        setUserName(profileResponse.data?.user?.name || 'Pengguna')
        setIsAuthenticated(true)
        await refreshDashboard()
      } catch (authError) {
        console.error(
          'Gagal memeriksa sesi autentikasi:',
          authError,
        )

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
    try {
      const profileResponse = await api.get('/auth/me')
      setUserName(profileResponse.data?.user?.name || 'Pengguna')
    } catch (profileError) {
      console.error('Gagal mengambil profil pengguna:', profileError)
      setUserName('Pengguna')
    }

    setIsAuthenticated(true)
    setAuthPage('home')
    setCurrentPage('dashboard')
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
    setUserName('')
    setAuthPage('home')
    setCurrentPage('dashboard')

    setSummary(null)
    setAccounts([])
    setError('')
    setLoading(false)
  }

  // Tampilkan loading sebelum menentukan halaman publik atau dashboard.
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Memeriksa sesi pengguna...
          </p>
        </div>
      </div>
    )
  }

  // Halaman publik: Homepage, Login, dan Register.
  if (!isAuthenticated) {
    return (
      <>
        {authPage === 'home' && (
          <PublicNavbar
            activePage={authPage}
            onHome={() => setAuthPage('home')}
            onLogin={() => setAuthPage('login')}
            onRegister={() => setAuthPage('register')}
          />
        )}

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

  // Loading setelah login atau saat memuat data dashboard.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Memuat dashboard...
          </p>
        </div>
      </div>
    )
  }

  // Tampilan jika data dashboard gagal dimuat.
  if (error || !summary) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-xl text-rose-600">
            !
          </div>

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Dashboard belum tersedia
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error || 'Data dashboard belum tersedia.'}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Muat Ulang
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="ml-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Keluar
          </button>
        </div>
      </div>
    )
  }

  // Halaman Akun Keuangan.
  if (currentPage === 'accounts') {
    return (
      <DashboardLayout
        currentPage={currentPage}
        onNavigate={(page: Page) => setCurrentPage(page)}
        onLogout={handleLogout}
      >
        <AccountsPage
          onBack={() => setCurrentPage('dashboard')}
          onDataChanged={refreshDashboard}
        />
      </DashboardLayout>
    )
  }

  // Halaman Anggaran Bulanan.
  if (currentPage === 'budgets') {
    return (
      <DashboardLayout currentPage={currentPage} onNavigate={(page: Page) => setCurrentPage(page)} onLogout={handleLogout}>
        <BudgetsPage onDataChanged={refreshDashboard} />
      </DashboardLayout>
    )
  }

  // Halaman Target Tabungan.
  if (currentPage === 'savings') {
    return (
      <DashboardLayout currentPage={currentPage} onNavigate={(page: Page) => setCurrentPage(page)} onLogout={handleLogout}>
        <SavingsGoalsPage onDataChanged={refreshDashboard} />
      </DashboardLayout>
    )
  }

  // Halaman Kategori Transaksi.
  if (currentPage === 'categories') {
    return (
      <DashboardLayout
        currentPage={currentPage}
        onNavigate={(page: Page) => setCurrentPage(page)}
        onLogout={handleLogout}
      >
        <CategoriesPage
          onBack={() => setCurrentPage('dashboard')}
          onDataChanged={refreshDashboard}
        />
      </DashboardLayout>
    )
  }

  // Halaman Transaksi.
  if (currentPage === 'transactions') {
    return (
      <DashboardLayout
        currentPage={currentPage}
        onNavigate={(page: Page) => setCurrentPage(page)}
        onLogout={handleLogout}
      >
        <TransactionsPage
          onBack={() => setCurrentPage('dashboard')}
          onDataChanged={refreshDashboard}
        />
      </DashboardLayout>
    )
  }

  // Dashboard utama.
  return (
    <DashboardLayout
      currentPage="dashboard"
      onNavigate={(page: Page) => setCurrentPage(page)}
      onLogout={handleLogout}
    >
      <main className="min-w-0 text-slate-900">
        {/* Welcome Dashboard */}
        <header className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 px-6 py-7 text-white shadow-lg shadow-emerald-900/10 sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border-[28px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-24 right-32 h-52 w-52 rounded-full bg-white/5" />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">
                Personal Finance Overview
              </p>
              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Halo, {userName || 'Pengguna'}! 👋
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50 sm:text-base">
                Senang melihatmu kembali. Yuk, pantau dan kelola kondisi keuanganmu hari ini.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium text-emerald-100">Ringkasan keuangan</p>
              <p className="mt-1 text-sm font-semibold">
                {new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(new Date())}
              </p>
            </div>
          </div>
        </header>

        {/* Summary Cards */}
        <section aria-label="Ringkasan keuangan" className="mb-8">
          <AutoGrid itemCount={4}>
          <StatCard
            title="Total saldo"
            value={summary.totalBalance}
            description="Akumulasi saldo seluruh akun"
            symbol="Rp"
            symbolClass="bg-emerald-50 text-emerald-700"
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
          </AutoGrid>
        </section>

        {/* Account Balances */}
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

            <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
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

              <button
                type="button"
                onClick={() => setCurrentPage('accounts')}
                className="mt-4 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Tambah Akun
              </button>
            </div>
          ) : (
            <AutoGrid itemCount={accounts.length}>
              {accounts.map((account) => {}
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
                    className="min-w-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-md shadow-slate-200/50 transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
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
            </AutoGrid>
          )}
        </section>

        {/* Budget and Recent Transactions */}
        <section className="dashboard-two-column-grid mb-8">
          <Card id="budgets" className="border-0 shadow-md shadow-slate-200/60">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <SectionTitle
                title="Anggaran bulanan"
                subtitle="Pantau penggunaan anggaran setiap kategori"
              />

              <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
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

          <Card id="transactions" className="border-0 shadow-md shadow-slate-200/60">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <SectionTitle
                title="Transaksi terbaru"
                subtitle="Geser untuk melihat riwayat transaksi lainnya"
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
              <div className="max-h-[240px] space-y-4 overflow-y-auto overscroll-contain pr-2 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
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

        {/* Savings Goals */}
        <section>
          <Card id="savings" className="border-0 shadow-md shadow-slate-200/60">
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
              <AutoGrid itemCount={summary.savingsGoals.length}>
                {summary.savingsGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="rounded-xl border border-slate-200 p-4 transition hover:border-emerald-200 hover:shadow-sm"
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
              </AutoGrid>
            )}
          </Card>
        </section>

        {/* Footer */}
        <footer className="mt-8 border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
          FinTrack · Personal Finance Management
        </footer>
      </main>
    </DashboardLayout>
  )
}

export default App
