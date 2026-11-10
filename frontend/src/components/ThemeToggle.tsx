type ThemeToggleProps = {
  isDarkMode: boolean
  onToggleTheme: () => void
  className?: string
}

export default function ThemeToggle({
  isDarkMode,
  onToggleTheme,
  className = '',
}: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggleTheme}
      aria-label={isDarkMode ? 'Aktifkan light mode' : 'Aktifkan dark mode'}
      aria-pressed={isDarkMode}
      title={isDarkMode ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
      className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 ${className}`}
    >
      <span aria-hidden="true" className="text-base">{isDarkMode ? '☀️' : '🌙'}</span>
      <span className="hidden sm:inline">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
    </button>
  )
}
