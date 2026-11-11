
import { useState, type FormEvent } from 'react'
import axios from 'axios'
import api from '../lib/api'
import ThemeToggle from '../components/ThemeToggle'

interface LoginProps {
  isDarkMode: boolean
  onToggleTheme: () => void
  onSwitchToRegister: () => void
  onLoginSuccess: () => void
}

interface AuthResponse {
  message: string
  token: string
  user: {
    id: string
    name: string
    email: string
  }
}

export default function Login({
  isDarkMode,
  onToggleTheme,
  onSwitchToRegister,
  onLoginSuccess,
}: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post<AuthResponse>('/auth/login', {
        email: email.trim(),
        password,
      })

      const { token } = response.data

      if (!token) {
        throw new Error('Token autentikasi tidak ditemukan.')
      }

      localStorage.setItem('fintrack_token', token)
      onLoginSuccess()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            'Login gagal. Periksa email dan password kamu.',
        )
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Terjadi kesalahan. Silakan coba kembali.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 py-12">
      <ThemeToggle isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} className="fixed right-5 top-5 z-50" />
      {/* Background decoration */}
      <div className="auth-glow pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-emerald-100/70 blur-3xl" />
      <div className="auth-glow pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-teal-50 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
          <div className="mb-6 flex items-center justify-center gap-2">
            <img
              src="/fintrack-icon.svg"
              alt="FinTrack"
              className="h-10 w-10 rounded-xl shadow-sm"
            />

            <span className="text-2xl font-bold tracking-tight">
              <span className="text-emerald-600">Fin</span>
              <span className="text-slate-900">Track</span>
            </span>
          </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9">
          <div className="mb-7">

            <h2 className="text-2xl text-center font-bold tracking-tight text-slate-900">
              Masuk ke akunmu
            </h2>

            <p className="mt-2 text-sm text-center leading-6 text-slate-500">
              Masukkan email dan password untuk melanjutkan ke FinTrack.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-24 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-800"
                >
                  {showPassword ? 'Sembunyikan' : 'Lihat'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? 'Memproses...' : 'Masuk ke FinTrack'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-xs text-slate-400">ATAU</span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <p className="text-center text-sm text-slate-500">
            Belum memiliki akun?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="font-bold text-emerald-600 transition hover:text-emerald-800 hover:underline"
            >
              Daftar sekarang
            </button>
          </p>
        </div>

        <p className="mt-7 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} FinTrack. Manage your money smarter.
        </p>
      </div>
    </div>
  )
}
