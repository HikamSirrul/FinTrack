
import { useEffect, useState } from 'react'
import ThemeToggle from './ThemeToggle'

type PublicNavbarProps = {
  activePage: 'home' | 'login' | 'register'
  isDarkMode: boolean
  onToggleTheme: () => void
  onHome: () => void
  onLogin: () => void
  onRegister: () => void
}

type Section = 'home' | 'features' | 'about'

export default function PublicNavbar({
  activePage,
  isDarkMode,
  onToggleTheme,
  onHome,
  onLogin,
  onRegister,
}: PublicNavbarProps) {
  const [activeSection, setActiveSection] = useState<Section>('home')

  useEffect(() => {
    if (activePage !== 'home') {
      return
    }

    const sections = ['home', 'features', 'about']

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio - a.intersectionRatio
          )

        if (visibleSections.length > 0) {
          setActiveSection(visibleSections[0].target.id as Section)
        }
      },
      {
        rootMargin: '-100px 0px -45% 0px',
        threshold: [0, 0.2, 0.4, 0.6],
      }
    )

    sections.forEach((id) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [activePage])

  const navigateSection = (section: Section) => {
    if (activePage !== 'home') {
      onHome()

      setTimeout(() => {
        document.getElementById(section)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 150)
    } else {
      document.getElementById(section)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }

    setActiveSection(section)
  }

  const navClass = (active: boolean) =>
    `relative rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
      active
        ? 'bg-emerald-50 text-emerald-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-emerald-700'
    }`

  const indicator = (
    <span className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-emerald-600" />
  )

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-3 sm:flex-nowrap sm:px-8 sm:py-4">
        {/* Logo */}
        <button
          type="button"
          onClick={() => {
            onHome()
            setActiveSection('home')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className="group flex items-center gap-2.5 rounded-xl"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl font-bold text-white transition-all duration-200 group-hover:scale-105 group-hover:bg-emerald-700">
            F
          </span>
          <span className="whitespace-nowrap text-lg font-bold tracking-tight text-slate-900 transition-colors group-hover:text-emerald-700 sm:text-xl">
            Fin<span className="text-emerald-600">Track</span>
          </span>
        </button>

        {/* Navigasi Homepage */}
        <nav className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => navigateSection('home')}
            className={navClass(
              activePage === 'home' && activeSection === 'home'
            )}
          >
            Beranda
            {activePage === 'home' &&
              activeSection === 'home' &&
              indicator}
          </button>

          <button
            type="button"
            onClick={() => navigateSection('features')}
            className={navClass(
              activePage === 'home' && activeSection === 'features'
            )}
          >
            Fitur
            {activePage === 'home' &&
              activeSection === 'features' &&
              indicator}
          </button>

          <button
            type="button"
            onClick={() => navigateSection('about')}
            className={navClass(
              activePage === 'home' && activeSection === 'about'
            )}
          >
            Tentang
            {activePage === 'home' &&
              activeSection === 'about' &&
              indicator}
          </button>
        </nav>

        {/* Login dan Register */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} className="px-2 sm:px-3" />
          <button
            type="button"
            onClick={onLogin}
            className={`rounded-xl px-2.5 py-2 text-xs font-semibold transition-all duration-200 sm:px-4 sm:text-sm ${
              activePage === 'login'
                ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
                : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-700'
            }`}
          >
            Masuk
          </button>

          <button
            type="button"
            onClick={onRegister}
            className={`rounded-xl px-2.5 py-2 text-xs font-semibold shadow-sm transition-all duration-200 sm:px-4 sm:py-2.5 sm:text-sm ${
              activePage === 'register'
                ? 'bg-emerald-800 text-white ring-2 ring-emerald-200'
                : 'bg-emerald-600 text-white hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md'
            }`}
          >
            Daftar
          </button>
        </div>
      </div>
    </header>
  )
}
