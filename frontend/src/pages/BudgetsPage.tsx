import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import api from '../lib/api'

type Category = { id: string; name: string; color: string; type: 'INCOME' | 'EXPENSE' }
type Budget = {
  id: string
  amount: number | string
  month: number
  year: number
  categoryId: string
  category: Category
}
type FormState = { categoryId: string; amount: string; month: number; year: number }

const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const currentDate = new Date()
const initialForm: FormState = { categoryId: '', amount: '', month: currentDate.getMonth() + 1, year: currentDate.getFullYear() }

function currency(value: number | string) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0)
}
function errorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message
  }
  return undefined
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterMonth, setFilterMonth] = useState(currentDate.getMonth() + 1)
  const [filterYear, setFilterYear] = useState(currentDate.getFullYear())
  const [spentByCategory, setSpentByCategory] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [budgetResponse, categoryResponse] = await Promise.all([
        api.get('/budgets', { params: { month: filterMonth, year: filterYear } }),
        api.get('/categories'),
      ])
      const rows: Budget[] = budgetResponse.data.budgets ?? []
      setBudgets(rows)
      setCategories((categoryResponse.data.categories ?? []).filter((item: Category) => item.type === 'EXPENSE'))
      const totals: Record<string, number> = {}
      for (const budget of rows) {
        totals[budget.categoryId] = Number((budget as Budget & { spentAmount?: number }).spentAmount ?? 0)
      }
      setSpentByCategory(totals)
    } catch (err) {
      setError(errorMessage(err) || 'Gagal memuat data anggaran.')
    } finally {
      setLoading(false)
    }
  }, [filterMonth, filterYear])

  useEffect(() => { void loadData() }, [loadData])

  const totalBudget = useMemo(() => budgets.reduce((sum, item) => sum + Number(item.amount), 0), [budgets])
  const totalSpent = useMemo(() => budgets.reduce((sum, item) => sum + (spentByCategory[item.categoryId] ?? 0), 0), [budgets])

  function resetForm() {
    setForm({ ...initialForm, month: filterMonth, year: filterYear })
    setEditingId(null)
  }

  function startEdit(item: Budget) {
    setEditingId(item.id)
    setForm({ categoryId: item.categoryId, amount: String(item.amount), month: item.month, year: item.year })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    const amount = Number(form.amount)
    if (!form.categoryId || !Number.isFinite(amount) || amount <= 0) {
      setError('Pilih kategori dan masukkan nominal anggaran yang valid.')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, amount }
      if (editingId) {
        await api.patch(`/budgets/${editingId}`, payload)
        setSuccess('Anggaran berhasil diperbarui.')
      } else {
        await api.post('/budgets', payload)
        setSuccess('Anggaran berhasil ditambahkan.')
      }
      resetForm()
      await loadData()
    } catch (err) {
      setError(errorMessage(err) || 'Gagal menyimpan anggaran.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item: Budget) {
    if (!window.confirm(`Hapus anggaran kategori ${item.category.name}?`)) return
    try {
      await api.delete(`/budgets/${item.id}`)
      setSuccess('Anggaran berhasil dihapus.')
      await loadData()
    } catch (err) {
      setError(errorMessage(err) || 'Gagal menghapus anggaran.')
    }
  }

  return (
    <main className="space-y-7 text-slate-900">
      <header>
        <p className="text-sm font-semibold tracking-wide text-emerald-600">PERENCANAAN KEUANGAN</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Anggaran Bulanan</h1>
        <p className="mt-2 text-sm text-slate-500">Atur batas pengeluaran dan pantau pemakaian anggaran berdasarkan kategori.</p>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{success}</div>}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Total anggaran</p><p className="mt-2 text-2xl font-bold">{currency(totalBudget)}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Total terpakai</p><p className="mt-2 text-2xl font-bold text-rose-600">{currency(totalSpent)}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Sisa anggaran</p><p className={`mt-2 text-2xl font-bold ${totalBudget - totalSpent < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{currency(totalBudget - totalSpent)}</p></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">{editingId ? 'Edit anggaran' : 'Buat anggaran baru'}</h2>
        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium text-slate-700">Kategori pengeluaran
            <select required value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
              <option value="">Pilih kategori</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Nominal anggaran (Rp)
            <input required type="number" min="1" step="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Contoh: 1000000" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="text-sm font-medium text-slate-700">Bulan
            <select value={form.month} onChange={e => setForm({ ...form, month: Number(e.target.value) })} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none focus:border-emerald-500">{monthNames.map((m,i) => <option key={m} value={i+1}>{m}</option>)}</select>
          </label>
          <label className="text-sm font-medium text-slate-700">Tahun
            <input required type="number" min="2000" max="2100" value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-emerald-500" />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
            <button disabled={saving || categories.length === 0} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Menyimpan...' : editingId ? 'Simpan perubahan' : 'Tambah anggaran'}</button>
            {editingId && <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>}
          </div>
        </form>
        {categories.length === 0 && <p className="mt-3 text-sm text-amber-700">Belum ada kategori pengeluaran. Buat kategori pengeluaran terlebih dahulu.</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="text-lg font-semibold">Daftar anggaran</h2><p className="mt-1 text-sm text-slate-500">Progres dihitung dari transaksi pengeluaran pada periode terpilih.</p></div>
          <div className="flex gap-2">
            <select aria-label="Filter bulan" value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">{monthNames.map((m,i) => <option key={m} value={i+1}>{m}</option>)}</select>
            <input aria-label="Filter tahun" type="number" min="2000" max="2100" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        {loading ? <p className="py-12 text-center text-sm text-slate-500">Memuat anggaran...</p> : budgets.length === 0 ? <div className="py-12 text-center"><p className="font-semibold text-slate-700">Belum ada anggaran untuk periode ini</p><p className="mt-1 text-sm text-slate-500">Tambahkan anggaran menggunakan formulir di atas.</p></div> : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {budgets.map(item => {
              const spent = spentByCategory[item.categoryId] ?? 0
              const percentage = Number(item.amount) > 0 ? Math.round(spent / Number(item.amount) * 100) : 0
              const over = spent > Number(item.amount)
              return <article key={item.id} className="rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.category.color }} /><div><h3 className="font-semibold">{item.category.name}</h3><p className="mt-1 text-xs text-slate-500">{monthNames[item.month-1]} {item.year}</p></div></div><span className={`rounded-lg px-2 py-1 text-xs font-semibold ${over ? 'bg-rose-50 text-rose-700' : percentage >= 80 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{percentage}% terpakai</span></div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${over ? 'bg-rose-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, percentage)}%` }} /></div>
                <div className="mt-3 flex justify-between gap-3 text-sm"><span className="text-slate-500">Terpakai <strong className="text-slate-800">{currency(spent)}</strong></span><span className="text-slate-500">Batas <strong className="text-slate-800">{currency(item.amount)}</strong></span></div>
                <p className={`mt-2 text-xs font-medium ${over ? 'text-rose-600' : 'text-emerald-700'}`}>{over ? `Melebihi batas sebesar ${currency(spent - Number(item.amount))}` : `Sisa anggaran ${currency(Number(item.amount) - spent)}`}</p>
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => startEdit(item)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">Edit</button><button type="button" onClick={() => void handleDelete(item)} className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">Hapus</button></div>
              </article>
            })}
          </div>
        )}
      </section>
    </main>
  )
}
