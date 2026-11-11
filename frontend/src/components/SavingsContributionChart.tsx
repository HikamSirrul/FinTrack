import { useState } from 'react'

type Contribution = {
  id: string
  amount: number | string
  createdAt: string
}

function currency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

function shortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

export default function SavingsContributionChart({
  contributions,
}: {
  contributions: Contribution[]
}) {
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null)

  const ordered = [...contributions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  if (ordered.length === 0) {
    return (
      <div className="mt-4 rounded-xl bg-slate-50 px-3 py-4 text-center">
        <p className="text-xs text-slate-500">
          Grafik akan terbentuk setelah setoran pertama dicatat.
        </p>
      </div>
    )
  }

  let runningTotal = 0
  const maxDeposit = Math.max(
    ...ordered.map((item) => Math.max(0, Number(item.amount) || 0)),
    1,
  )
  const points = ordered.map((item, index) => {
    const amount = Number(item.amount) || 0
    runningTotal += amount
    const x = ordered.length === 1 ? 50 : (index / (ordered.length - 1)) * 100
    const y = 76 - (amount / maxDeposit) * 58
    return { ...item, x, y, amount, runningTotal }
  })
  const polyline = points
    .map((point) => `${point.x},${point.y}`)
    .join(' ')
  const area = `${points[0].x},76 ${polyline} ${points[points.length - 1].x},76`
  const selectedPoint = points.find((point) => point.id === selectedPointId)

  return (
    <div className="savings-contribution-chart mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-600">Grafik setoran</p>
        <p className="text-[10px] text-slate-400">{ordered.length} setoran</p>
      </div>
      <svg
        viewBox="0 0 100 82"
        preserveAspectRatio="none"
        className="h-24 w-full overflow-visible"
        role="img"
        aria-label="Grafik saldo kumulatif berdasarkan setiap setoran tabungan"
      >
        {[18, 47, 76].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="#e2eae6"
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />
        ))}
        <polygon points={area} fill="#8eaa9e" fillOpacity="0.12" />
        <polyline
          points={polyline}
          fill="none"
          stroke="#78998b"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((point) => (
          <g key={point.id}>
            <circle
              cx={point.x}
              cy={point.y}
              r={selectedPointId === point.id ? '3.2' : '1.8'}
              fill={selectedPointId === point.id ? '#047857' : '#78998b'}
              className="cursor-pointer outline-none focus:outline-none focus-visible:outline-none"
              style={{ outline: 'none' }}
              role="button"
              tabIndex={0}
              aria-label={`Lihat setoran ${currency(point.amount)} tanggal ${shortDate(point.createdAt)}`}
              aria-pressed={selectedPointId === point.id}
              onClick={() => setSelectedPointId(point.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setSelectedPointId(point.id)
                }
              }}
              vectorEffect="non-scaling-stroke"
            />
            <title>
              {shortDate(point.createdAt)} · Setoran {currency(point.amount)} · Akumulasi {currency(point.runningTotal)}
            </title>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{shortDate(ordered[0].createdAt)}</span>
        <span>{shortDate(ordered[ordered.length - 1].createdAt)}</span>
      </div>
      {selectedPoint && (
        <div className="mt-3 rounded-lg border border-emerald-100 bg-white px-3 py-2.5 text-xs shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-700">Detail setoran</p>
            <p className="text-[10px] text-slate-400">{shortDate(selectedPoint.createdAt)}</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Nominal setoran</span>
            <span className="font-semibold text-emerald-700">{currency(selectedPoint.amount)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="text-slate-500">Total akumulasi</span>
            <span className="font-semibold text-slate-700">{currency(selectedPoint.runningTotal)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
