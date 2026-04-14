// ── StatCards ────────────────────────────────────────────────────────────────
import type { CountryScored } from '@/lib/scoring'

interface StatCardsProps {
  top: CountryScored; bottom: CountryScored
  avg: number; usa?: CountryScored
  nCrit: number; nShock: number; tariff: number
}

function StatCard({ value, label, delta, accentClass }: {
  value: string; label: string; delta: string; accentClass: string
}) {
  return (
    <div className={`stat-card ${accentClass}`}>
      <div className="font-mono text-xl font-semibold text-white leading-none">{value}</div>
      <div className="font-mono text-xs tracking-wider uppercase text-tx2 mt-1.5">{label}</div>
      <div className="font-mono text-xs text-tx2 mt-1">{delta}</div>
    </div>
  )
}

export function StatCards({ top, bottom, avg, usa, nCrit, nShock, tariff }: StatCardsProps) {
  return (
    <div className="grid grid-cols-5 gap-3">
      <StatCard
        value={top.country.split(' ')[0]}
        label="🏆 Mayor ICG"
        delta={`ICG = ${top.base_icg.toFixed(1)}`}
        accentClass="before:bg-c1"
      />
      <StatCard
        value={bottom.country.split(' ')[0]}
        label="⚠ Menor ICG"
        delta={`ICG = ${bottom.base_icg.toFixed(1)}`}
        accentClass="before:bg-danger"
      />
      <StatCard
        value={avg.toFixed(1)}
        label="📊 Promedio Panel"
        delta="50 países"
        accentClass="before:bg-c3"
      />
      <StatCard
        value={(usa?.base_icg ?? 0).toFixed(1)}
        label="🇺🇸 ICG EE.UU."
        delta={tariff > 0 ? `Δ ${((usa?.icg_delta ?? 0)).toFixed(1)} arancel` : 'Benchmark global'}
        accentClass="before:bg-c3"
      />
      <StatCard
        value={String(nCrit + nShock)}
        label="🚨 Alertas"
        delta={`${nCrit} críticos · ${nShock} alto shock`}
        accentClass="before:bg-warn"
      />
    </div>
  )
}

// ── TabNav ────────────────────────────────────────────────────────────────────
interface TabNavProps {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
}

export function TabNav({ tabs, active, onChange }: TabNavProps) {
  return (
    <nav className="border-b border-border px-6 flex overflow-x-auto bg-panel/50">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`tab-btn ${active === tab.id ? 'active' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

export default StatCards
