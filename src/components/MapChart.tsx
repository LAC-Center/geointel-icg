'use client'

import { Chart, COLORS, ICG_COLORSCALE, DARK_LAYOUT } from './Chart'
import type { CountryScored } from '@/lib/scoring'
import type { MapMetric } from '@/app/page'

const METRIC_LABELS: Record<MapMetric, string> = {
  base_icg:             '🌐 ICG Base',
  leverage:             '⚡ Apalancamiento',
  resilience:           '🛡 Resiliencia',
  regulatory_power:     '📜 Poder Regulatorio',
  strategic_signal:     '📡 Señal Estratégica',
  capital_confirmation: '💰 Confirmación Capital',
  shock_score:          '💥 Shock Score',
  icg_delta:            '📉 Δ ICG (Tariff)',
}

const METRIC_TITLES: Record<MapMetric, string> = {
  base_icg:             'BASE_ICG — Capacidad Geoeconómica Estructural',
  leverage:             'APALANCAMIENTO — Exportaciones Críticas + CGV + Reservas',
  resilience:           'RESILIENCIA — Energía + Alimentos + Independencia',
  regulatory_power:     'PODER REGULATORIO — NTMs + Export Controls + Estándares',
  strategic_signal:     'SEÑAL ESTRATÉGICA — Consenso Institucional + Think Tanks',
  capital_confirmation: 'CONFIRMACIÓN CAPITAL — FDI Estratégico + CAPEX Soberano',
  shock_score:          'SHOCK LAYER — Perturbaciones Activas',
  icg_delta:            'Δ ICG — Impacto Arancelario Trump 2026',
}

interface Props {
  data: CountryScored[]
  metric: MapMetric
  onMetricChange: (m: MapMetric) => void
  tariff: number
}

export default function MapChart({ data, metric, onMetricChange, tariff }: Props) {
  const values = data.map(d => d[metric as keyof CountryScored] as number)
  const mn = Math.min(...values)
  const mx = Math.max(...values)

  const plotData = [{
    type: 'choropleth' as const,
    locations: data.map(d => d.iso3),
    z: values,
    text: data.map(d => d.country),
    hovertemplate: (
      '<b>%{text}</b><br>' +
      'ICG Base: %{customdata[0]:.1f}<br>' +
      'Apalancamiento: %{customdata[1]:.1f}<br>' +
      'Resiliencia: %{customdata[2]:.1f}<br>' +
      'Poder Reg.: %{customdata[3]:.1f}<br>' +
      'Shock: %{customdata[4]:.1f}<extra></extra>'
    ),
    customdata: data.map(d => [
      d.base_icg, d.leverage, d.resilience, d.regulatory_power, d.shock_score,
    ]),
    colorscale: metric === 'icg_delta' ? 'RdYlGn' : ICG_COLORSCALE,
    zmin: mn, zmax: mx,
    marker: { line: { color: COLORS.border2, width: 0.6 } },
    colorbar: {
      title: { text: METRIC_LABELS[metric], font: { size: 9, color: COLORS.c3 } },
      tickfont: { size: 7, color: COLORS.tx2, family: 'IBM Plex Mono, monospace' },
      len: 0.55, thickness: 10,
      bgcolor: COLORS.panel, bordercolor: COLORS.border,
    },
  }]

  const layout = {
    ...DARK_LAYOUT,
    title: {
      text: METRIC_TITLES[metric],
      font: { size: 11, color: '#D0E0F0', family: 'IBM Plex Mono, monospace' },
      x: 0.03,
    },
    geo: {
      bgcolor: COLORS.bg,
      showframe: false,
      showcoastlines: true,
      coastlinecolor: COLORS.border2,
      showland: true,
      landcolor: COLORS.panel,
      showocean: true,
      oceancolor: COLORS.bg,
      projection: { type: 'natural earth' as const },
    },
    margin: { t: 50, b: 5, l: 0, r: 0 },
  }

  return (
    <div className="flex gap-4">
      {/* Metric selector */}
      <div className="w-44 flex-shrink-0">
        <p className="sec-label">Métrica</p>
        <div className="space-y-1">
          {(Object.keys(METRIC_LABELS) as MapMetric[]).map(m => (
            <button
              key={m}
              onClick={() => onMetricChange(m)}
              className={`w-full text-left text-xs px-2.5 py-1.5 rounded border transition-colors
                ${metric === m
                  ? 'bg-c1/10 border-c1/40 text-c1 font-mono'
                  : 'border-transparent text-tx2 hover:text-tx hover:bg-panel'
                }`}
            >
              {METRIC_LABELS[m]}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <p className="sec-label">Leyenda ICG</p>
          {[
            ['Dominante', '#00C9A7', '72-100'],
            ['Fuerte',    '#3DB87A', '55-72'],
            ['Intermedio','#D4820A', '35-55'],
            ['Vulnerable','#C0390A', '18-35'],
            ['Crítico',   '#6B0F0F', '0-18'],
          ].map(([label, color, range]) => (
            <div key={label} className="flex items-center gap-1.5 mb-1">
              <span style={{ color }} className="text-sm leading-none">■</span>
              <span className="text-xs text-tx2">{label}</span>
              <span className="text-xs text-tx2/50 ml-auto font-mono">{range}</span>
            </div>
          ))}
        </div>

        {tariff > 0 && (
          <div className="mt-3 alert alert-amber text-xs">
            ⚡ Arancel activo: <strong>{tariff}%</strong>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 min-w-0">
        <Chart data={plotData as any} layout={layout as any} height={500} />
      </div>
    </div>
  )
}
