import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import api from '../lib/api'

type Goal = {
  id: string
  name: string
  targetAmount: number | string
  currentAmount: number | string
  deadline: string | null
}
type GoalForm = { name: string; targetAmount: string; currentAmount: string; deadline: string }
const emptyForm: GoalForm = { name: '', targetAmount: '', currentAmount: '0', deadline: '' }

function currency(value: number | string) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0)
}
function errorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) return (error as { response?: { data?: { message?: string } } }).response?.data?.message
  return undefined
}
function dateInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

export default function SavingsGoalsPage({ onDataChanged }: { onDataChanged?: () => Promise<void> }) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [form, setForm] = useState<GoalForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [contributionId, setContributionId] = useState<string | null>(null)
  const [contribution, setContribution] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadGoals = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/savings-goals')
      setGoals(response.data.goals ?? [])
    } catch (err) {
      setError(errorMessage(err) || 'Gagal memuat target tabungan.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void loadGoals() }, [loadGoals])

  const totalTarget = useMemo(() => goals.reduce((sum, goal) => sum + Number(goal.targetAmount), 0), [goals])
  const totalSaved = useMemo(() => goals.reduce((sum, goal) => sum + Number(goal.currentAmount), 0), [goals])
  const completed = goals.filter(goal => Number(goal.currentAmount) >= Number(goal.targetAmount)).length

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }
  function startEdit(goal: Goal) {
    setEditingId(goal.id)
    setForm({ name: goal.name, targetAmount: String(goal.targetAmount), currentAmount: String(goal.currentAmount), deadline: dateInput(goal.deadline) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    const targetAmount = Number(form.targetAmount)
    const currentAmount = Number(form.currentAmount)
    if (!form.name.trim() || !Number.isFinite(targetAmount) || targetAmount <= 0 || !Number.isFinite(currentAmount) || currentAmount < 0 || currentAmount > targetAmount) {
      setError('Periksa nama dan nominal target. Tabungan terkumpul tidak boleh melebihi target.')
      return
    }
    setSaving(true)
    try {
      const payload = { name: form.name.trim(), targetAmount, currentAmount, deadline: form.deadline ? new Date(`${form.deadline}T23:59:59`).toISOString() : null }
      if (editingId) {
        await api.patch(`/savings-goals/${editingId}`, payload)
        setSuccess('Target tabungan berhasil diperbarui.')
      } else {
        await api.post('/savings-goals', payload)
        setSuccess('Target tabungan berhasil dibuat.')
      }
      resetForm()
      await loadGoals()
      await onDataChanged?.()
    } catch (err) {
      setError(errorMessage(err) || 'Gagal menyimpan target tabungan.')
    } finally {
      setSaving(false)
    }
  }
  async function handleContribution(goal: Goal) {
    const amount = Number(contribution)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Masukkan nominal setoran yang valid.')
      return
    }
    const nextAmount = Number(goal.currentAmount) + amount
    if (nextAmount > Number(goal.targetAmount)) {
      setError('Nominal setoran melebihi sisa target tabungan.')
      return
    }
    try {
      await api.patch(`/savings-goals/${goal.id}`, { currentAmount: nextAmount })
      setContribution('')
      setContributionId(null)
      setSuccess(`Setoran ${currency(amount)} berhasil ditambahkan ke ${goal.name}.`)
      await loadGoals()
      await onDataChanged?.()
    } catch (err) {
      setError(errorMessage(err) || 'Gagal menambahkan setoran.')
    }
  }
  async function handleDelete(goal: Goal) {
    if (!window.confirm(`Hapus target tabungan "${goal.name}"?`)) return
    try {
      await api.delete(`/savings-goals/${goal.id}`)
      setSuccess('Target tabungan berhasil dihapus.')
      if (editingId === goal.id) resetForm()
      await loadGoals()
      await onDataChanged?.()
    } catch (err) {
      setError(errorMessage(err) || 'Gagal menghapus target tabungan.')
    }
  }

  return (
    <main className="space-y-7 text-slate-900">
      <header>
        <p className="text-sm font-semibold tracking-wide text-emerald-600">PERENCANAAN KEUANGAN</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Target Tabungan Bulanan</h1>
        <p className="mt-2 text-sm text-slate-500">Buat tujuan finansial, tambahkan setoran, dan pantau progres tabunganmu.</p>
      </header>
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{success}</div>}

      <section className="dashboard-auto-grid">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Total target</p><p className="mt-2 text-2xl font-bold">{currency(totalTarget)}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Total terkumpul</p><p className="mt-2 text-2xl font-bold text-emerald-600">{currency(totalSaved)}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Target tercapai</p><p className="mt-2 text-2xl font-bold">{completed} <span className="text-base font-medium text-slate-400">/ {goals.length}</span></p></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">{editingId ? 'Edit target tabungan' : 'Buat target tabungan'}</h2>
        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Nama target
            <input required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Dana darurat" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="text-sm font-medium text-slate-700">Nominal target (Rp)
            <input required type="number" min="1" step="1" value={form.targetAmount} onChange={e => setForm({ ...form, targetAmount: e.target.value })} placeholder="5000000" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-emerald-500" />
          </label>
          <label className="text-sm font-medium text-slate-700">Tabungan awal (Rp)
            <input type="number" min="0" step="1" value={form.currentAmount} onChange={e => setForm({ ...form, currentAmount: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-emerald-500" />
          </label>
          <label className="text-sm font-medium text-slate-700">Tanggal target
            <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-emerald-500" />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button disabled={saving} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Menyimpan...' : editingId ? 'Simpan perubahan' : 'Buat target'}</button>
            {editingId && <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Daftar target</h2><p className="mt-1 text-sm text-slate-500">Perbarui progres setiap kali kamu menabung.</p></div><span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{goals.length} target</span></div>
        {loading ? <p className="py-12 text-center text-sm text-slate-500">Memuat target tabungan...</p> : goals.length === 0 ? <div className="py-12 text-center"><p className="font-semibold text-slate-700">Belum ada target tabungan</p><p className="mt-1 text-sm text-slate-500">Buat target pertamamu melalui formulir di atas.</p></div> : (
          <div className="mt-6 dashboard-auto-grid">
            {goals.map(goal => {
              const target = Number(goal.targetAmount)
              const saved = Number(goal.currentAmount)
              const percent = target > 0 ? Math.min(100, Math.round(saved / target * 100)) : 0
              const remaining = Math.max(0, target - saved)
              const reached = remaining === 0
              return <article key={goal.id} className="rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{goal.name}</h3><p className="mt-1 text-xs text-slate-500">{goal.deadline ? `Target ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(goal.deadline))}` : 'Tanpa batas waktu'}</p></div><span className={`rounded-lg px-2 py-1 text-xs font-semibold ${reached ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{reached ? 'Tercapai' : `${percent}%`}</span></div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} /></div>
                <div className="mt-3 flex justify-between gap-3 text-sm"><span className="text-slate-500">Terkumpul <strong className="text-slate-800">{currency(saved)}</strong></span><span className="text-slate-500">Target <strong className="text-slate-800">{currency(target)}</strong></span></div>
                <p className="mt-2 text-xs font-medium text-slate-500">{reached ? 'Selamat! Target tabungan tercapai.' : `Kurang ${currency(remaining)} lagi`}</p>
                {contributionId === goal.id && <div className="mt-4 flex gap-2"><input type="number" min="1" max={remaining} step="1" value={contribution} onChange={e => setContribution(e.target.value)} placeholder="Nominal setoran" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" /><button type="button" onClick={() => void handleContribution(goal)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Simpan</button></div>}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {!reached && <button type="button" onClick={() => { setContributionId(contributionId === goal.id ? null : goal.id); setContribution('') }} className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">{contributionId === goal.id ? 'Batal setoran' : 'Tambah setoran'}</button>}
                  <button type="button" onClick={() => startEdit(goal)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">Edit</button>
                  <button type="button" onClick={() => void handleDelete(goal)} className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">Hapus</button>
                </div>
              </article>
            })}
          </div>
        )}
      </section>
    </main>
  )
}
