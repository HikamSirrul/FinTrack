
import { useState } from 'react'
import type { ReactNode } from 'react'

type Page =
  | 'dashboard'
  | 'accounts'
  | 'categories'
  | 'transactions'

type DashboardLayoutProps = {
  currentPage: Page
  onNavigate: (page: Page) => void
  onLogout: () => void
  children: ReactNode
}

const navigation = [
  {
    label: 'Dashboard',
    page: 'dashboard' as Page,
    icon: '▦',
  },
  {
    label: 'Akun',
    page: 'accounts' as Page,
    icon: '▤',
  },
  {
    label: 'Kategori',
    page: 'categories' as Page,
    icon: '▧',
  },
  {
    label: 'Transaksi',
    page: 'transactions' as Page,
    icon: '↔',
  },
]

export default function DashboardLayout({
  currentPage,
  onNavigate,
  onLogout,
  children,
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigate = (page: Page) => {
    onNavigate(page)
    setMobileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navigateSection = (section: 'budgets' | 'savings') => {
    if (currentPage !== 'dashboard') {
      onNavigate('dashboard')
    }

    setMobileMenuOpen(false)

    window.setTimeout(() => {
      document.getElementById(section)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 100)
  }

  const navClass = (active: boolean) =>
    `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
      active
        ? 'bg-emerald-50 text-emerald-700'
        : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-700'
    }`

  const sidebarContent = (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl font-bold text-white">
          F
        </div>

        <span className="text-2xl font-bold tracking-tight">
          <span className="text-emerald-600">Fin</span>
          <span className="text-slate-900">Track</span>
        </span>
      </div>

      <div className="flex-1 space-y-7 overflow-y-auto px-4 py-6">
        <div>
          <p className="mb-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">
            Menu Utama
          </p>

          <nav className="space-y-1">
            {navigation.map((item) => (
              <button
                key={item.page}
                type="button"
                onClick={() => navigate(item.page)}
                className={navClass(currentPage === item.page)}
              >
                <span className="w-5 text-center text-lg">
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div>
          <p className="mb-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">
            Perencanaan
          </p>

          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => navigateSection('budgets')}
              className={navClass(false)}
            >
              <span className="w-5 text-center text-lg">◷</span>
              Anggaran
            </button>

            <button
              type="button"
              onClick={() => navigateSection('savings')}
              className={navClass(false)}
            >
              <span className="w-5 text-center text-lg">♧</span>
              Target Tabungan
            </button>
          </nav>
        </div>
      </div>

      <div className="border-t border-slate-100 p-4">
        <div className="mb-3 rounded-xl bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-800">
            FinTrack
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            Personal Finance Management
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
        >
          <span className="w-5 text-center text-lg">↪</span>
          Keluar
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white">
            F
          </div>

          <span className="text-xl font-bold">
            <span className="text-emerald-600">Fin</span>
            <span className="text-slate-900">Track</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Buka menu navigasi"
          aria-expanded={mobileMenuOpen}
          className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:hidden ${
          mobileMenuOpen
            ? 'translate-x-0'
            : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="min-w-0 lg:ml-64">
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
