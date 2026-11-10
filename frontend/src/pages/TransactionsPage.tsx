
import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import api from '../lib/api'

type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER'
type CategoryType = 'INCOME' | 'EXPENSE'

interface Account {
  id: string
  name: string
  type: string
}

interface Category {
  id: string
  name: string
  type: CategoryType
  color?: string
}

interface Transaction {
  id: string
  type: TransactionType
  amount: number | string
  description: string | null
  date: string
  accountId?: string | null
  categoryId?: string | null
  transferFromId?: string | null
  transferToId?: string | null
  account?: Account | null
  category?: Category | null
  transferFrom?: Account | null
  transferTo?: Account | null
}

interface TransactionForm {
  type: TransactionType
  amount: string
  description: string
  date: string
  accountId: string
  categoryId: string
  transferFromId: string
  transferToId: string
}

interface TransactionsPageProps {
  onBack: () => void
  onDataChanged: () => Promise<void>
}

function getLocalDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function createInitialForm(): TransactionForm {
  return {
    type: 'EXPENSE',
    amount: '',
    description: '',
    date: getLocalDate(),
    accountId: '',
    categoryId: '',
    transferFromId: '',
    transferToId: '',
  }
}

function getErrorMessage(err: unknown): string | undefined {
  if (
    typeof err !== 'object' ||
    err === null ||
    !('response' in err)
  ) {
    return undefined
  }

  return (
    err as {
      response?: { data?: { message?: string } }
    }
  ).response?.data?.message
}

function extractList<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) {
    return data as T[]
  }

  if (typeof data === 'object' && data !== null && key in data) {
    const list = (data as Record<string, unknown>)[key]

    if (Array.isArray(list)) {
      return list as T[]
    }
  }

  return []
}

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function getTransactionLabel(type: TransactionType) {
  if (type === 'INCOME') return 'Pemasukan'
  if (type === 'EXPENSE') return 'Pengeluaran'
  return 'Transfer'
}

export default function TransactionsPage({
  onDataChanged,
}: TransactionsPageProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<TransactionForm>(createInitialForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | TransactionType>('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [
        transactionResponse,
        accountResponse,
        categoryResponse,
      ] = await Promise.all([
        api.get('/transactions'),
        api.get('/accounts'),
        api.get('/categories'),
      ])

      setTransactions(
        extractList<Transaction>(
          transactionResponse.data,
          'transactions',
        ),
      )

      setAccounts(
        extractList<Account>(
          accountResponse.data,
          'accounts',
        ),
      )

      setCategories(
        extractList<Category>(
          categoryResponse.data,
          'categories',
        ),
      )
    } catch (err: unknown) {
      setError(
        getErrorMessage(err) ||
          'Gagal memuat transaksi, akun, atau kategori. Periksa koneksi backend dan status login.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTransactions()
  }, [loadTransactions])

  const availableCategories = categories.filter(
    (category) => category.type === form.type,
  )

  function updateType(type: TransactionType) {
    setForm((current) => ({
      ...current,
      type,
      categoryId: '',
      accountId: '',
      transferFromId: '',
      transferToId: '',
    }))
  }

  function resetForm() {
    setForm(createInitialForm())
    setEditingId(null)
    setError('')
    setSuccess('')
  }

  function startEdit(transaction: Transaction) {
    const transactionDate = new Date(transaction.date)

    const localDate = [
      transactionDate.getFullYear(),
      String(transactionDate.getMonth() + 1).padStart(2, '0'),
      String(transactionDate.getDate()).padStart(2, '0'),
    ].join('-')

    setEditingId(transaction.id)

    setForm({
      type: transaction.type,
      amount: String(transaction.amount),
      description: transaction.description ?? '',
      date: localDate,
      accountId:
        transaction.accountId ??
        transaction.account?.id ??
        '',
      categoryId:
        transaction.categoryId ??
        transaction.category?.id ??
        '',
      transferFromId:
        transaction.transferFromId ??
        transaction.transferFrom?.id ??
        '',
      transferToId:
        transaction.transferToId ??
        transaction.transferTo?.id ??
        '',
    })

    setError('')
    setSuccess('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const amount = Number(form.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Nominal transaksi harus lebih besar dari nol.')
      return
    }

    if (!form.date) {
      setError('Tanggal transaksi wajib diisi.')
      return
    }

    if (accounts.length === 0) {
      setError(
        'Tambahkan akun terlebih dahulu sebelum mencatat transaksi.',
      )
      return
    }

    if (form.type === 'TRANSFER') {
      if (!form.transferFromId || !form.transferToId) {
        setError('Pilih akun asal dan akun tujuan transfer.')
        return
      }

      if (form.transferFromId === form.transferToId) {
        setError(
          'Akun asal dan tujuan transfer harus berbeda.',
        )
        return
      }
    } else {
      if (!form.accountId) {
        setError('Pilih akun untuk transaksi ini.')
        return
      }

      if (!form.categoryId) {
        setError('Pilih kategori transaksi.')
        return
      }
    }

    const isEditing = Boolean(editingId)

    const payload = {
      type: form.type,
      amount,
      description: form.description.trim() || undefined,
      date: new Date(`${form.date}T12:00:00`).toISOString(),
      ...(form.type === 'TRANSFER'
        ? {
            transferFromId: form.transferFromId,
            transferToId: form.transferToId,
          }
        : {
            accountId: form.accountId,
            categoryId: form.categoryId,
          }),
    }

    setSaving(true)

    try {
      if (editingId) {
        await api.patch(
          `/transactions/${editingId}`,
          payload,
        )
      } else {
        await api.post('/transactions', payload)
      }

      setForm(createInitialForm())
      setEditingId(null)

      setSuccess(
        isEditing
          ? 'Transaksi berhasil diperbarui.'
          : 'Transaksi berhasil ditambahkan.',
      )

      // Muat ulang daftar transaksi dan akun pada halaman ini.
      await loadTransactions()

      // Perbarui saldo akun dan ringkasan dashboard.
      await onDataChanged()
    } catch (err: unknown) {
      setError(
        getErrorMessage(err) ||
          'Transaksi berhasil diproses, tetapi pembaruan data gagal. Periksa koneksi backend.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(transaction: Transaction) {
    const confirmed = window.confirm(
      `Hapus transaksi "${transaction.description || getTransactionLabel(transaction.type)}" sebesar ${formatCurrency(transaction.amount)}?`,
    )

    if (!confirmed) return

    setError('')
    setSuccess('')

    try {
      await api.delete(`/transactions/${transaction.id}`)

      if (editingId === transaction.id) {
        setForm(createInitialForm())
        setEditingId(null)
      }

      setSuccess('Transaksi berhasil dihapus.')

      // Muat ulang daftar transaksi dan akun pada halaman ini.
      await loadTransactions()

      // Perbarui saldo akun dan ringkasan dashboard.
      await onDataChanged()
    } catch (err: unknown) {
      setError(
        getErrorMessage(err) ||
          'Transaksi berhasil dihapus, tetapi pembaruan data gagal. Periksa koneksi backend.',
      )
    }
  }

  const visibleTransactions = transactions.filter(
    (transaction) => {
      const matchesType =
        filter === 'ALL' || transaction.type === filter

      const text = [
        transaction.description ?? '',
        transaction.account?.name ?? '',
        transaction.category?.name ?? '',
        transaction.transferFrom?.name ?? '',
        transaction.transferTo?.name ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return (
        matchesType &&
        text.includes(search.trim().toLowerCase())
      )
    },
  )

  const totalIncome = transactions
    .filter((transaction) => transaction.type === 'INCOME')
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0,
    )

  const totalExpense = transactions
    .filter((transaction) => transaction.type === 'EXPENSE')
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0,
    )

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>

            <h1 className="mt-1 text-3xl font-bold">
              Manajemen Transaksi
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Catat dan kelola aktivitas keuangan Anda.
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

        <section className="dashboard-auto-grid" style={{ '--grid-columns': Math.max(1, Math.ceil(Math.sqrt(3))) } as CSSProperties}>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Transaksi
            </p>

            <p className="mt-2 text-3xl font-bold">
              {transactions.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Pemasukan
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {formatCurrency(totalIncome)}
            </p>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Pengeluaran
            </p>

            <p className="mt-2 text-2xl font-bold text-rose-600">
              {formatCurrency(totalExpense)}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            {editingId ? 'Edit Transaksi' : 'Tambah Transaksi'}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="mt-5 grid gap-5 sm:grid-cols-2"
          >
            <label className="block text-sm font-medium">
              Jenis Transaksi

              <select
                value={form.type}
                onChange={(event) =>
                  updateType(
                    event.target.value as TransactionType,
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="EXPENSE">Pengeluaran</option>
                <option value="INCOME">Pemasukan</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </label>

            <label className="block text-sm font-medium">
              Nominal (Rp)

              <input
                required
                type="number"
                min="1"
                step="1"
                value={form.amount}
                onChange={(event) =>
                  setForm({
                    ...form,
                    amount: event.target.value,
                  })
                }
                placeholder="Contoh: 50000"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            {form.type === 'TRANSFER' ? (
              <>
                <label className="block text-sm font-medium">
                  Akun Asal

                  <select
                    required
                    value={form.transferFromId}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        transferFromId: event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="">Pilih akun asal</option>

                    {accounts.map((account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium">
                  Akun Tujuan

                  <select
                    required
                    value={form.transferToId}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        transferToId: event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="">Pilih akun tujuan</option>

                    {accounts.map((account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <>
                <label className="block text-sm font-medium">
                  Akun

                  <select
                    required
                    value={form.accountId}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        accountId: event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="">Pilih akun</option>

                    {accounts.map((account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium">
                  Kategori

                  <select
                    required
                    value={form.categoryId}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        categoryId: event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="">Pilih kategori</option>

                    {availableCategories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <label className="block text-sm font-medium">
              Tanggal

              <input
                required
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm({
                    ...form,
                    date: event.target.value,
                  })
                }
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label className="block text-sm font-medium">
              Deskripsi

              <input
                maxLength={500}
                value={form.description}
                onChange={(event) =>
                  setForm({
                    ...form,
                    description: event.target.value,
                  })
                }
                placeholder="Contoh: Makan siang"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
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
                    : 'Tambah Transaksi'}
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-xl font-bold">
              Daftar Transaksi
            </h2>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Cari deskripsi atau akun..."
                aria-label="Cari transaksi"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm"
              />

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(
                    event.target.value as
                      | 'ALL'
                      | TransactionType,
                  )
                }
                aria-label="Filter jenis transaksi"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
              >
                <option value="ALL">Semua jenis</option>
                <option value="INCOME">Pemasukan</option>
                <option value="EXPENSE">Pengeluaran</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="py-10 text-center text-slate-500">
              Memuat transaksi...
            </p>
          ) : visibleTransactions.length === 0 ? (
            <p className="py-10 text-center text-slate-500">
              Tidak ada transaksi yang cocok. Tambahkan transaksi
              melalui formulir di atas.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-medium">
                      Transaksi
                    </th>
                    <th className="px-3 py-3 font-medium">
                      Jenis
                    </th>
                    <th className="px-3 py-3 font-medium">
                      Akun
                    </th>
                    <th className="px-3 py-3 font-medium">
                      Nominal
                    </th>
                    <th className="px-3 py-3 font-medium">
                      Tanggal
                    </th>
                    <th className="px-3 py-3 font-medium">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleTransactions.map((transaction) => {
                    const accountName =
                      transaction.type === 'TRANSFER'
                        ? `${
                            transaction.transferFrom?.name ??
                            accounts.find(
                              (account) =>
                                account.id ===
                                transaction.transferFromId,
                            )?.name ??
                            'Akun asal'
                          } → ${
                            transaction.transferTo?.name ??
                            accounts.find(
                              (account) =>
                                account.id ===
                                transaction.transferToId,
                            )?.name ??
                            'Akun tujuan'
                          }`
                        : transaction.account?.name ??
                          accounts.find(
                            (account) =>
                              account.id === transaction.accountId,
                          )?.name ??
                          '—'

                    return (
                      <tr
                        key={transaction.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-3 py-4">
                          <p className="font-semibold">
                            {transaction.description ||
                              getTransactionLabel(
                                transaction.type,
                              )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {transaction.category?.name ??
                              (transaction.type === 'TRANSFER'
                                ? 'Transfer antar akun'
                                : 'Tanpa kategori')}
                          </p>
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className={`inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${
                              transaction.type === 'INCOME'
                                ? 'bg-emerald-50 text-emerald-700'
                                : transaction.type === 'EXPENSE'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-indigo-50 text-indigo-700'
                            }`}
                          >
                            {getTransactionLabel(
                              transaction.type,
                            )}
                          </span>
                        </td>

                        <td className="px-3 py-4">
                          {accountName}
                        </td>

                        <td
                          className={`whitespace-nowrap px-3 py-4 font-semibold ${
                            transaction.type === 'INCOME'
                              ? 'text-emerald-600'
                              : transaction.type === 'EXPENSE'
                                ? 'text-rose-600'
                                : 'text-indigo-600'
                          }`}
                        >
                          {transaction.type === 'INCOME'
                            ? '+'
                            : transaction.type === 'EXPENSE'
                              ? '−'
                              : ''}
                          {formatCurrency(transaction.amount)}
                        </td>

                        <td className="whitespace-nowrap px-3 py-4">
                          {formatDate(transaction.date)}
                        </td>

                        <td className="px-3 py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                startEdit(transaction)
                              }
                              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void handleDelete(transaction)
                              }
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
