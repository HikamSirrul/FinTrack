import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import api from '../lib/api'

type CategoryType = 'INCOME' | 'EXPENSE'

interface Category {
  id: string
  name: string
  type: CategoryType
  color: string
  createdAt?: string
}

interface CategoryForm {
  name: string
  type: CategoryType
  color: string
}

const initialForm: CategoryForm = {
  name: '',
  type: 'EXPENSE',
  color: '#64748b',
}

function getErrorMessage(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null || !('response' in err)) {
    return undefined
  }

  return (
    err as {
      response?: { data?: { message?: string } }
    }
  ).response?.data?.message
}

export default function CategoriesPage({ onDataChanged }: {
  onBack: () => void
  onDataChanged?: () => Promise<void>
}) {
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<CategoryForm>(initialForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | CategoryType>('ALL')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadCategories = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/categories')
      setCategories(response.data.categories ?? [])
    } catch (err: unknown) {
      setError(
        getErrorMessage(err) ||
          'Gagal memuat kategori. Periksa koneksi backend dan status login.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  function resetForm() {
    setForm(initialForm)
    setEditingId(null)
    setError('')
    setSuccess('')
  }

  function startEdit(category: Category) {
    setEditingId(category.id)
    setForm({
      name: category.name,
      type: category.type,
      color: category.color || '#64748b',
    })
    setError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const payload = {
      name: form.name.trim(),
      type: form.type,
      color: form.color,
    }

    if (!payload.name) {
      setError('Nama kategori wajib diisi.')
      return
    }

    setSaving(true)

    try {
      if (editingId) {
        await api.patch(`/categories/${editingId}`, payload)
        setSuccess('Kategori berhasil diperbarui.')
      } else {
        await api.post('/categories', payload)
        setSuccess('Kategori berhasil ditambahkan.')
      }

      setForm(initialForm)
      setEditingId(null)
      await loadCategories()
      await onDataChanged?.()
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Gagal menyimpan kategori.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(category: Category) {
    const confirmed = window.confirm(
      `Hapus kategori "${category.name}"?`,
    )

    if (!confirmed) return

    setError('')
    setSuccess('')

    try {
      await api.delete(`/categories/${category.id}`)
      setSuccess(`Kategori "${category.name}" berhasil dihapus.`)

      if (editingId === category.id) {
        setForm(initialForm)
        setEditingId(null)
      }

      await loadCategories()
      await onDataChanged?.()
    } catch (err: unknown) {
      setError(
        getErrorMessage(err) ||
          'Kategori tidak dapat dihapus. Pastikan kategori tidak sedang digunakan.',
      )
    }
  }

  const visibleCategories = categories.filter(
    (category) => filter === 'ALL' || category.type === filter,
  )

  const incomeCount = categories.filter(
    (category) => category.type === 'INCOME',
  ).length

  const expenseCount = categories.filter(
    (category) => category.type === 'EXPENSE',
  ).length

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mt-1 text-3xl font-bold">
              Manajemen Kategori
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Kelompokkan pemasukan dan pengeluaran agar keuangan lebih terorganisasi.
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
            <p className="text-sm text-slate-500">Total Kategori</p>
            <p className="mt-2 text-3xl font-bold">{categories.length}</p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Kategori Pemasukan</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {incomeCount}
            </p>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Kategori Pengeluaran</p>
            <p className="mt-2 text-3xl font-bold text-rose-600">
              {expenseCount}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            {editingId ? 'Edit Kategori' : 'Tambah Kategori'}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="mt-5 grid gap-5 sm:grid-cols-2"
          >
            <label className="block text-sm font-medium">
              Nama Kategori
              <input
                required
                maxLength={100}
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Contoh: Makanan"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            <label className="block text-sm font-medium">
              Jenis Kategori
              <select
                value={form.type}
                onChange={(event) =>
                  setForm({
                    ...form,
                    type: event.target.value as CategoryType,
                  })
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500"
              >
                <option value="EXPENSE">Pengeluaran</option>
                <option value="INCOME">Pemasukan</option>
              </select>
            </label>

            <label className="block text-sm font-medium sm:col-span-2">
              Warna Kategori
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  value={form.color}
                  onChange={(event) =>
                    setForm({ ...form, color: event.target.value })
                  }
                  aria-label="Pilih warna kategori"
                  className="h-12 w-16 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                />
                <span className="text-sm text-slate-500">
                  {form.color.toUpperCase()}
                </span>
              </div>
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
                    : 'Tambah Kategori'}
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Daftar Kategori</h2>

            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as 'ALL' | CategoryType)
              }
              aria-label="Filter kategori"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
            >
              <option value="ALL">Semua kategori</option>
              <option value="INCOME">Pemasukan</option>
              <option value="EXPENSE">Pengeluaran</option>
            </select>
          </div>

          {loading ? (
            <p className="py-10 text-center text-slate-500">
              Memuat kategori...
            </p>
          ) : visibleCategories.length === 0 ? (
            <p className="py-10 text-center text-slate-500">
              Tidak ada kategori untuk filter ini. Tambahkan kategori melalui formulir di atas.
            </p>
          ) : (
            <div className="mt-5 dashboard-auto-grid" style={{ '--grid-columns': Math.max(1, Math.ceil(Math.sqrt(visibleCategories.length))) } as CSSProperties}>
              {visibleCategories.map((category) => (
                <article
                  key={category.id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-1 h-4 w-4 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color || '#64748b' }}
                    />

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-bold">
                        {category.name}
                      </h3>
                      <span
                        className={`mt-2 inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${
                          category.type === 'INCOME'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {category.type === 'INCOME'
                          ? 'Pemasukan'
                          : 'Pengeluaran'}
                      </span>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-slate-500">
                    Warna: {category.color || '#64748b'}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(category)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(category)}
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
