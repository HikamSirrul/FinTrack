import type { ReactNode } from 'react'

type HomePageProps = {
  onLogin: () => void
  onRegister: () => void
}

type FeatureCardProps = {
  icon: ReactNode
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="text-sm leading-6 text-slate-600">{description}</p>
    </article>
  )
}

export default function HomePage({ onRegister }: HomePageProps) {
  return (
    <div className="home-page min-h-screen overflow-hidden bg-white text-slate-800">
     

      <main>
        {/* Hero */}
        <section id="home" className="relative isolate">
          <div className="home-glow pointer-events-none absolute -right-40 -top-32 -z-10 h-96 w-96 rounded-full bg-emerald-100/70 blur-3xl" />
          <div className="home-glow pointer-events-none absolute -bottom-20 -left-40 -z-10 h-96 w-96 rounded-full bg-teal-50 blur-3xl" />

          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-28">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 sm:text-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Kelola keuangan dengan lebih terarah
              </div>

              <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Kendalikan keuangan,
                <span className="block text-emerald-600">wujudkan tujuan.</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                FinTrack membantu Anda mencatat pemasukan dan pengeluaran,
                memantau saldo, mengatur anggaran, serta merencanakan target
                tabungan dalam satu tempat.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onRegister}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
                >
                  Mulai Sekarang <span aria-hidden="true">→</span>
                </button>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50"
                >
                  Pelajari Fitur
                </a>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500">
                <span className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Pencatatan terorganisir</span>
                <span className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Pantau anggaran</span>
              </div>
            </div>

            {/* Finance dashboard illustration */}
            <div className="relative mx-auto w-full max-w-xl">
              <div className="home-visual-glow absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-emerald-100 via-teal-50 to-white blur-xl" />
              <div className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10 sm:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Ringkasan Keuangan</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">Pantau kondisi finansialmu</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">⌁</div>
                </div>

                <div className="mt-6 rounded-2xl bg-emerald-600 p-5 text-white sm:p-6">
                  <p className="text-sm text-emerald-100">Total Saldo</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">Keuangan Terkelola</p>
                  <p className="mt-2 text-sm text-emerald-100">Semua akun dalam satu ringkasan</p>
                  <div className="mt-6 flex items-end gap-1.5" aria-hidden="true">
                    {[35, 52, 43, 67, 48, 76, 61, 88, 70, 100, 78, 92].map((height, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t-md bg-white/80"
                        style={{ height: `${height * 0.55}px` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-700">↗</span>
                      Pemasukan
                    </div>
                    <p className="mt-3 font-bold text-slate-900">Catat pemasukan</p>
                    <p className="mt-1 text-xs text-slate-500">Pantau uang yang diterima</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">↙</span>
                      Pengeluaran
                    </div>
                    <p className="mt-3 font-bold text-slate-900">Atur pengeluaran</p>
                    <p className="mt-1 text-xs text-slate-500">Ketahui ke mana uang pergi</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                  <div>
                    <p className="font-semibold text-slate-900">Target Tabungan</p>
                    <p className="mt-1 text-xs text-slate-500">Rencanakan tujuan finansial</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-xl">◎</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-slate-50 px-5 py-20 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">Fitur FinTrack</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Semua yang dibutuhkan untuk mengelola keuangan
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                Kelola aktivitas finansial harian dengan fitur yang sederhana dan mudah dipahami.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon="▤"
                title="Manajemen Akun"
                description="Kelola berbagai sumber dana seperti uang tunai, rekening bank, dan dompet digital."
              />
              <FeatureCard
                icon="↕"
                title="Transaksi"
                description="Catat pemasukan, pengeluaran, dan transfer antar akun agar arus uang lebih terpantau."
              />
              <FeatureCard
                icon="▥"
                title="Kategori Transaksi"
                description="Kelompokkan transaksi berdasarkan kategori untuk memudahkan evaluasi keuangan."
              />
              <FeatureCard
                icon="◎"
                title="Anggaran"
                description="Tentukan batas pengeluaran berdasarkan kategori dan pantau penggunaannya."
              />
              <FeatureCard
                icon="⌖"
                title="Target Tabungan"
                description="Buat tujuan menabung dan pantau perkembangan pencapaiannya secara berkala."
              />
              <FeatureCard
                icon="▦"
                title="Dashboard Ringkasan"
                description="Lihat gambaran kondisi keuangan melalui ringkasan saldo dan aktivitas transaksi."
              />
            </div>
          </div>
        </section>

        {/* About / CTA */}
        <section id="about" className="px-5 py-20 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-5xl rounded-3xl bg-slate-950 px-6 py-12 text-center sm:px-12 sm:py-16">
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-400">Mulai kelola keuangan</p>
            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Langkah kecil hari ini untuk kondisi finansial yang lebih baik.
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-300">
              Buat akun FinTrack dan mulai kelola pemasukan, pengeluaran, anggaran, serta tabungan Anda.
            </p>
            <button
              type="button"
              onClick={onRegister}
              className="mt-8 rounded-xl bg-emerald-500 px-7 py-3.5 font-semibold text-white transition hover:bg-emerald-400"
            >
              Buat Akun Gratis
            </button>
          </div>
        </section>
      </main>
        <footer className="border-t border-slate-100 px-5 py-7 sm:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-center">
                <p className="text-center text-sm text-slate-500">
                © {new Date().getFullYear()} FinTrack. Kelola keuangan dengan lebih terarah.
                </p>
            </div>
        </footer>
    </div>
  )
}
