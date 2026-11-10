
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import api from '../lib/api'

type AccountType = 'CASH' | 'BANK' | 'E_WALLET' | 'OTHER'

interface Account {
  id: string
  name: string
  type: AccountType
  initialBalance: number | string
  createdAt: string
}

interface AccountForm {
  name: string
  type: AccountType
  initialBalance: string
}

const initialForm: AccountForm = {
  name: '',
  type: 'BANK',
  initialBalance: '0',
}

const accountTypeLabels: Record<AccountType, string> = {
  CASH: 'Tunai',
  BANK: 'Rekening Bank',
  E_WALLET: 'E-Wallet',
  OTHER: 'Lainnya',
}

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

export default function AccountsPage({ onDataChanged }: {
  onBack: () => void
  onDataChanged?: () => Promise<void>
}) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [form, setForm] = useState<AccountForm>(initialForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/accounts')
      setAccounts(response.data.accounts ?? [])
    } catch (err: unknown) {
      const message =
        typeof err === 'object' &&
        err !== null &&
        'response' in err
          ? (
              err as {
                response?: {
                  data?: { message?: string }
                }
              }
            ).response?.data?.message
          : undefined

      setError(
        message ||
          'Gagal memuat akun. Periksa login dan koneksi backend.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAccounts()
  }, [loadAccounts])

  function resetForm() {
    setForm(initialForm)
    setEditingId(null)
    setError('')
    setSuccess('')
  }

  function startEdit(account: Account) {
    setEditingId(account.id)
    setForm({
      name: account.name,
      type: account.type,
      initialBalance: String(account.initialBalance),
    })
    setError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const payload = {
      name: form.name.trim(),
      type: form.type,
      initialBalance: Number(form.initialBalance),
    }

    if (
      !payload.name ||
      !Number.isFinite(payload.initialBalance) ||
      payload.initialBalance < 0
    ) {
      setError('Masukkan nama akun dan saldo awal yang valid.')
      setSaving(false)
      return
    }

    try {
      if (editingId) {
        await api.patch(`/accounts/${editingId}`, payload)
        setSuccess('Akun berhasil diperbarui.')
      } else {
        await api.post('/accounts', payload)
        setSuccess('Akun berhasil ditambahkan.')
      }

      setForm(initialForm)
      setEditingId(null)
      await loadAccounts()
      await onDataChanged?.()
    } catch (err: unknown) {
      const message =
        typeof err === 'object' &&
        err !== null &&
        'response' in err
          ? (
              err as {
                response?: {
                  data?: { message?: string }
                }
              }
            ).response?.data?.message
          : undefined

      setError(message || 'Gagal menyimpan akun.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(account: Account) {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus akun "${account.name}"?`,
    )

    if (!confirmed) return

    setError('')
    setSuccess('')

    try {
      await api.delete(`/accounts/${account.id}`)
      setSuccess('Akun berhasil dihapus.')

      if (editingId === account.id) {
        resetForm()
      }

      await loadAccounts()
      await onDataChanged?.()
    } catch (err: unknown) {
      const message =
        typeof err === 'object' &&
        err !== null &&
        'response' in err
          ? (
              err as {
                response?: {
                  data?: { message?: string }
                }
              }
            ).response?.data?.message
          : undefined

      setError(message || 'Gagal menghapus akun.')
    }
  }

  const totalInitialBalance = accounts.reduce(
    (total, account) => total + Number(account.initialBalance || 0),
    0,
  )

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mt-1 text-3xl font-bold">
              Manajemen Akun
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Kelola rekening bank, uang tunai, dan e-wallet Anda.
            </p>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            {success}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Total Saldo Awal
          </p>
          <p className="mt-2 text-3xl font-bold">
            {formatCurrency(totalInitialBalance)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Jumlah saldo awal akun, bukan saldo terkini setelah transaksi.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            {editingId ? 'Edit Akun' : 'Tambah Akun'}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="mt-5 grid gap-5 sm:grid-cols-2"
          >
            <label className="block text-sm font-medium">
              Nama Akun
              <input
                required
                maxLength={100}
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Contoh: BCA Utama"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            <label className="block text-sm font-medium">
              Jenis Akun
              <select
                value={form.type}
                onChange={(event) =>
                  setForm({
                    ...form,
                    type: event.target.value as AccountType,
                  })
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500"
              >
                {Object.entries(accountTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium sm:col-span-2">
              Saldo Awal (Rp)
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.initialBalance}
                onChange={(event) =>
                  setForm({
                    ...form,
                    initialBalance: event.target.value,
                  })
                }
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </label>

            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving
                  ? 'Menyimpan...'
                  : editingId
                    ? 'Simpan Perubahan'
                    : 'Tambah Akun'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold hover:bg-slate-50"
                >
                  Batal Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Daftar Akun</h2>
            <span className="text-sm text-slate-500">
              {accounts.length} akun
            </span>
          </div>

          {loading ? (
            <p className="py-10 text-center text-slate-500">
              Memuat daftar akun...
            </p>
          ) : accounts.length === 0 ? (
            <p className="py-10 text-center text-slate-500">
              Belum ada akun. Tambahkan akun pertama Anda melalui formulir di atas.
            </p>
          ) : (
            <div className="mt-5 dashboard-auto-grid">
              {accounts.map((account) => (
                <article
                  key={account.id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{account.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {accountTypeLabels[account.type] ?? account.type}
                      </p>
                    </div>
                    <span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                      {account.type}
                    </span>
                  </div>

                  <p className="mt-5 text-xs text-slate-500">
                    Saldo awal
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    {formatCurrency(account.initialBalance)}
                  </p>

                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(account)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(account)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Hapus
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
