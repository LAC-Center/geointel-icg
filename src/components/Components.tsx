'use client'
// ─────────────────────────────────────────────────────────────────────────────
// All remaining dashboard components
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { Chart, COLORS, ICG_COLORSCALE, DARK_LAYOUT } from './Chart'
import type { CountryScored, Theme, ArbitrageRow } from '@/lib/scoring'
import { computeBaseICG, BLOCS, getThemeLeaders, computeBlocScores } from '@/lib/scoring'
import { DATABASE } from '@/lib/data'
import { build_temporal_panel, compute_regime_signals } from '@/lib/temporal'

// ── RankingBar ────────────────────────────────────────────────────────────────
const RANK_COLS = [
  { value: 'base_icg',             label: 'ICG Base' },
  { value: 'leverage',             label: 'Apalancamiento' },
  { value: 'resilience',           label: 'Resiliencia' },
  { value: 'regulatory_power',     label: 'Poder Regulatorio' },
  { value: 'strategic_signal',     label: 'Señal Estratégica' },
  { value: 'capital_confirmation', label: 'Confirmación Capital' },
  { value: 'shock_score',          label: 'Shock Score' },
]

export function RankingBar({ data, col, onColChange, theme }: {
  data: CountryScored[]; col: string
  onColChange: (c: string) => void; theme: Theme
}) {
  const [n, setN] = useState(25)
  const sorted = [...data].sort((a, b) =>
    (b[col as keyof CountryScored] as number) - (a[col as keyof CountryScored] as number)
  ).slice(0, n)

  const vals  = sorted.map(d => d[col as keyof CountryScored] as number)
  const names = sorted.map(d => d.country)
  const colors = vals.map(v =>
    v > 70 ? COLORS.c1 : v > 50 ? COLORS.c3 : v > 35 ? COLORS.c2 : v > 20 ? COLORS.warn : COLORS.danger
  )

  return (
    <div className="flex gap-4">
      <div className="w-40 flex-shrink-0">
        <p className="sec-label">Ordenar por</p>
        <div className="space-y-1 mb-4">
          {RANK_COLS.map(c => (
            <button key={c.value} onClick={() => onColChange(c.value)}
              className={`w-full text-left text-xs px-2.5 py-1.5 rounded border transition-colors
                ${col === c.value ? 'bg-c1/10 border-c1/40 text-c1' : 'border-transparent text-tx2 hover:text-tx hover:bg-panel'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="sec-label">Países: {n}</p>
        <input type="range" min={10} max={50} step={1} value={n}
          onChange={e => setN(Number(e.target.value))}
          className="w-full h-1 bg-border2 rounded appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                     [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-c2 [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>
      <div className="flex-1 min-w-0">
        <Chart height={Math.max(400, n * 22)} data={[{
          type: 'bar', orientation: 'h',
          x: vals, y: names,
          marker: { color: colors, line: { width: 0 } },
          text: vals.map(v => v.toFixed(1)),
          textposition: 'outside',
          textfont: { family: 'IBM Plex Mono', size: 8, color: COLORS.tx },
          hovertemplate: '<b>%{y}</b><br>Score: %{x:.1f}<extra></extra>',
        }]} layout={{
          ...DARK_LAYOUT,
          title: { text: `Ranking — ${RANK_COLS.find(c=>c.value===col)?.label}`,
                   font: { size: 11, color: '#D0E0F0', family: 'IBM Plex Mono' } },
          xaxis: { range: [0, 118], title: 'Score (0-100)' },
          yaxis: { autorange: 'reversed' as const, tickfont: { size: 9 } },
          showlegend: false,
        } as any} />
      </div>
    </div>
  )
}

// ── RadarDual ─────────────────────────────────────────────────────────────────
const RADAR_DIMS = ['base_icg','leverage','resilience','regulatory_power','strategic_signal','capital_confirmation'] as const
const RADAR_LBLS = ['ICG Base','Apalancam.','Resiliencia','Poder Reg.','Señal','Capital']

export function RadarDual({ data, countryA, countryB }: {
  data: CountryScored[]; countryA: string; countryB: string
}) {
  const ra = data.find(d => d.country === countryA)
  const rb = data.find(d => d.country === countryB)
  if (!ra || !rb) return <p className="text-tx2">País no encontrado.</p>

  const makeTrace = (r: CountryScored, name: string, color: string) => {
    const vals = [...RADAR_DIMS.map(d => r[d]), r[RADAR_DIMS[0]]]
    const lbls = [...RADAR_LBLS, RADAR_LBLS[0]]
    return {
      type: 'scatterpolar' as const, r: vals, theta: lbls, name,
      line: { color, width: 2.5 },
      fill: 'toself' as const,
      fillcolor: color + '14',
    }
  }

  // Comparison table
  const rows = RADAR_DIMS.map(dim => {
    const va = ra[dim], vb = rb[dim]
    const aWins = va > vb, bWins = vb > va
    return { dim, label: RADAR_LBLS[RADAR_DIMS.indexOf(dim)], va, vb, aWins, bWins }
  })
  const winsA = rows.filter(r => r.aWins).length
  const winsB = rows.filter(r => r.bWins).length

  return (
    <div className="space-y-4">
      <Chart height={460} data={[makeTrace(ra, countryA, COLORS.c1), makeTrace(rb, countryB, COLORS.c2)]}
        layout={{
          ...DARK_LAYOUT,
          polar: {
            bgcolor: COLORS.panel,
            radialaxis: { visible: true, range: [0, 100], gridcolor: COLORS.border,
                          tickfont: { size: 7, color: COLORS.tx2 } },
            angularaxis: { gridcolor: COLORS.border, tickfont: { size: 10, color: COLORS.tx } },
          },
          title: { text: `${countryA} vs. ${countryB}`,
                   font: { size: 11, color: '#D0E0F0', family: 'IBM Plex Mono' } },
        } as any} />

      {/* Comparison table */}
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0C1525] border-b border-border2">
              <th className="text-left px-4 py-2.5 font-mono text-tx2 tracking-wider uppercase text-xs">Dimensión</th>
              <th className="text-center px-4 py-2.5 font-mono text-c1">{countryA}</th>
              <th className="text-center px-4 py-2.5 font-mono text-c2">{countryB}</th>
            </tr>
          </thead>
          <tbody className="bg-panel divide-y divide-border">
            {rows.map(row => (
              <tr key={row.dim} className="hover:bg-border/30 transition-colors">
                <td className="px-4 py-2 font-mono text-tx2">{row.label}</td>
                <td className={`px-4 py-2 text-center font-mono ${row.aWins ? 'text-c1' : 'text-tx'}`}>
                  {(row.va as number).toFixed(1)}
                  {row.aWins && <span className="win-badge">✓</span>}
                </td>
                <td className={`px-4 py-2 text-center font-mono ${row.bWins ? 'text-c2' : 'text-tx'}`}>
                  {(row.vb as number).toFixed(1)}
                  {row.bWins && <span className="win-badge">✓</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="insight">
        <p className="font-mono text-xs text-c3 mb-2">SÍNTESIS</p>
        <span className="font-mono" style={{ color: winsA >= winsB ? COLORS.c1 : COLORS.c2 }}>
          {winsA >= winsB ? countryA : countryB}
        </span>{' '}
        lidera en <strong>{Math.max(winsA, winsB)}</strong> de {RADAR_DIMS.length} dimensiones.
        ICG: <span className="text-c1 font-mono">{ra.base_icg.toFixed(1)}</span> vs{' '}
        <span className="text-c2 font-mono">{rb.base_icg.toFixed(1)}</span>
        {' · '}Shock: <span className="text-warn font-mono">{ra.shock_score.toFixed(1)}</span> vs{' '}
        <span className="text-warn font-mono">{rb.shock_score.toFixed(1)}</span>
      </div>
    </div>
  )
}

// ── MaterialVsRegulatory ──────────────────────────────────────────────────────
export function MaterialVsRegulatory({ data }: { data: CountryScored[] }) {
  const mid = 50
  const quads = [
    { x0:mid,x1:102,y0:mid,y1:102,text:'POTENCIAS\nCOMPLETAS',    color:'rgba(0,201,167,0.04)' },
    { x0:0,  x1:mid,y0:mid,y1:102,text:'REGULADORES\nSIN MÚSCULO',color:'rgba(74,158,202,0.04)' },
    { x0:mid,x1:102,y0:0,  y1:mid,text:'GIGANTES\nSIN PALANCA',   color:'rgba(240,165,0,0.04)' },
    { x0:0,  x1:mid,y0:0,  y1:mid,text:'ESTADOS\nFRÁGILES',       color:'rgba(229,62,62,0.04)' },
  ]

  const shapes = quads.map(q => ({
    type: 'rect' as const, x0:q.x0,x1:q.x1,y0:q.y0,y1:q.y1,
    fillcolor: q.color, line: { width: 0 },
  }))
  const annotations = quads.map(q => ({
    x:(q.x0+q.x1)/2, y:(q.y0+q.y1)/2, text:q.text, showarrow:false,
    font: { size:7.5, color:COLORS.tx2, family:'IBM Plex Mono' },
    opacity: 0.7, align: 'center' as const,
  }))

  const sizes = data.map(d => Math.sqrt(d.gdp_bn / 20) + 6)

  const highMatLowReg = data.filter(d => d.base_icg > 55 && d.regulatory_power < 45).slice(0,4)
  const divergent     = [...data].sort((a,b) => b.narrative_capital_divergence - a.narrative_capital_divergence).slice(0,4)

  return (
    <div className="space-y-4">
      <div className="alert alert-blue text-xs">
        <strong>NUEVA:</strong> Matriz Capacidad Material vs Poder Regulatorio.
        La distinción clave que los índices tradicionales ignoran: China tiene alta capacidad material
        pero bajo poder regulatorio en chips. Países Bajos tiene bajo músculo pero controla ASML.
        Color = Señal Estratégica. Tamaño = PIB.
      </div>

      <Chart height={540} data={[{
        type: 'scatter', mode: 'text+markers',
        x: data.map(d => d.base_icg),
        y: data.map(d => d.regulatory_power),
        text: data.map(d => d.country),
        textposition: 'top center' as const,
        textfont: { size: 7, color: COLORS.tx, family: 'IBM Plex Mono' },
        marker: {
          size: sizes,
          color: data.map(d => d.strategic_signal),
          colorscale: [[0,'#1A2A3A'],[0.5,COLORS.c3],[1,COLORS.c1]],
          showscale: true,
          line: { color: COLORS.border2, width: 0.8 },
          colorbar: { title: { text: 'Señal\nEstratégica', font:{size:8,color:COLORS.c3} },
                      len:0.5,thickness:8,bgcolor:COLORS.panel,bordercolor:COLORS.border,
                      tickfont:{family:'IBM Plex Mono',size:7} },
        },
        hovertemplate: '<b>%{text}</b><br>ICG Base: %{x:.1f}<br>Poder Regulatorio: %{y:.1f}<br>Señal: %{marker.color:.1f}<extra></extra>',
      }]} layout={{
        ...DARK_LAYOUT,
        shapes, annotations,
        title: { text:'Matriz: Capacidad Material vs Poder Regulatorio',
                 font:{size:11,color:'#D0E0F0',family:'IBM Plex Mono'} },
        xaxis: { title:'Base ICG (Capacidad Material)', range:[0,106] },
        yaxis: { title:'Poder Regulatorio', range:[0,106] },
      } as any} />

      <div className="grid grid-cols-2 gap-3">
        <div className="insight">
          <p className="font-mono text-xs text-c3 mb-2">GIGANTES SIN PALANCA REGULATORIA</p>
          Alta capacidad material, bajo poder normativo: {highMatLowReg.map(d=>d.country).join(', ')}
        </div>
        <div className="insight">
          <p className="font-mono text-xs text-c3 mb-2">NARRATIVA SIN CAPITAL (DIVERGENCIA)</p>
          Señal institucional alta, confirmación financiera baja: {divergent.map(d=>d.country).join(', ')}
        </div>
      </div>
    </div>
  )
}

// ── ConvergenceHeatmap ────────────────────────────────────────────────────────
const THEMES_DISPLAY = ['Energía','Chips','Minerales','Alimentos','Shipping','Defensa','IA']
const THEME_KEYS_CONV = ['theme_energy','theme_chips','theme_minerals','theme_food','theme_shipping','theme_defense','theme_ai'] as const

export function ConvergenceHeatmap({ data }: { data: CountryScored[] }) {
  const top25 = data.slice(0, 25)
  const z = top25.map(d =>
    THEME_KEYS_CONV.map(tk => {
      const score  = d[tk as keyof CountryScored] as number
      const capN   = d.capital_confirmation / 100 * 10
      const shockI = 10 - d.shock_score
      return (score * 0.5 + capN * 0.3 + shockI * 0.2)
    })
  )

  return (
    <div className="space-y-3">
      <div className="alert alert-blue text-xs">
        <strong>CONVERGENCIA:</strong> Verde intenso = narrativa institucional + capital + resiliencia alineados.
        La señal más fuerte que puede detectar el sistema.
      </div>
      <Chart height={600} data={[{
        type: 'heatmap',
        z, x: THEMES_DISPLAY,
        y: top25.map(d => d.country),
        colorscale: [[0,COLORS.bg],[0.3,'#1A3050'],[0.6,COLORS.c3],[1,COLORS.c1]],
        zmin:0, zmax:10,
        hovertemplate: '<b>%{y}</b> · %{x}<br>Convergencia: %{z:.1f}<extra></extra>',
        colorbar: { title:{text:'Convergencia',font:{size:8}},
                    len:0.6,thickness:10,bgcolor:COLORS.panel,bordercolor:COLORS.border,
                    tickfont:{family:'IBM Plex Mono',size:7} },
      }]} layout={{
        ...DARK_LAYOUT,
        title: { text:'Heatmap de Convergencia: Narrativa × Capital × Resiliencia',
                 font:{size:11,color:'#D0E0F0',family:'IBM Plex Mono'} },
        xaxis: { side:'top', tickangle:-30, tickfont:{size:9} },
        yaxis: { autorange:'reversed' as const, tickfont:{size:8} },
        margin: { t:80,b:10,l:130,r:30 },
      } as any} />
    </div>
  )
}

// ── BlocRadar ─────────────────────────────────────────────────────────────────
const BLOC_DIMS   = ['base_icg','leverage','resilience','regulatory_power','strategic_signal','capital_confirmation'] as const
const BLOC_LBLS   = ['ICG','Apalancam.','Resiliencia','Poder Reg.','Señal','Capital']
const BLOC_COLORS: Record<string,string> = {
  G7:COLORS.c1, BRICS:COLORS.c2, UE:COLORS.c3,
  Quad:'#A78BFA', ASEAN:'#F97316', GCC:'#EC4899',
}

export function BlocRadar({ blocs }: { blocs: ReturnType<typeof computeBlocScores>[0][] }) {
  const traces = blocs.filter(Boolean).map(b => {
    const vals = [...BLOC_DIMS.map(d => (b as any)[d] ?? 0), (b as any)[BLOC_DIMS[0]] ?? 0]
    const color = BLOC_COLORS[b!.bloc] ?? COLORS.tx2
    return {
      type:'scatterpolar' as const, r:vals, theta:[...BLOC_LBLS,BLOC_LBLS[0]],
      name:b!.bloc, line:{color,width:2}, fill:'toself' as const, fillcolor: color+'11',
    }
  })

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <Chart height={500} data={traces} layout={{
          ...DARK_LAYOUT,
          polar: {
            bgcolor:COLORS.panel,
            radialaxis:{visible:true,range:[0,100],gridcolor:COLORS.border,
                        tickfont:{size:7,color:COLORS.tx2}},
            angularaxis:{gridcolor:COLORS.border,tickfont:{size:10,color:COLORS.tx}},
          },
          title:{text:'Comparación de Bloques Geopolíticos',
                 font:{size:11,color:'#D0E0F0',family:'IBM Plex Mono'}},
        } as any} />
      </div>
      <div className="w-72 flex-shrink-0">
        <p className="sec-label">Scores por Bloque</p>
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#0C1525] border-b border-border2">
                <th className="px-3 py-2 text-left font-mono text-tx2">Bloque</th>
                <th className="px-2 py-2 text-center font-mono text-tx2">ICG</th>
                <th className="px-2 py-2 text-center font-mono text-tx2">Reg.</th>
                <th className="px-2 py-2 text-center font-mono text-tx2">Shock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-panel">
              {blocs.filter(Boolean).map(b => (
                <tr key={b!.bloc} className="hover:bg-border/30">
                  <td className="px-3 py-2 font-mono" style={{color: BLOC_COLORS[b!.bloc]}}>{b!.bloc}</td>
                  <td className="px-2 py-2 text-center font-mono text-tx">{b!.base_icg.toFixed(1)}</td>
                  <td className="px-2 py-2 text-center font-mono text-tx">{b!.regulatory_power.toFixed(1)}</td>
                  <td className="px-2 py-2 text-center font-mono text-warn">{b!.shock_score.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── TariffSimulator ───────────────────────────────────────────────────────────
export function TariffSimulator({ rawData, scored, tariff, theme }: {
  rawData: typeof DATABASE; scored: CountryScored[]
  tariff: number; theme: Theme
}) {
  const [country, setCountry] = useState('Mexico')
  const [step]                = useState(5)

  const top20 = [...scored].sort((a,b) => a.icg_delta - b.icg_delta).slice(0,20)

  // Trajectory
  const tariffRange = Array.from({length: Math.floor(100/step)+1}, (_,i) => i*step)
  const trajectory = useMemo(() => {
    return tariffRange.map(t => {
      const sim = computeBaseICG(rawData, theme, 1, 1, t)
      const idx = rawData.findIndex(d => d.country === country)
      return { t, icg: idx >= 0 ? sim.icg[idx] : 0 }
    })
  }, [country, theme, rawData, tariffRange])

  const base_vals = trajectory.map(p => p.icg)
  const opt_vals  = base_vals.map(v => Math.min(100, v * 1.08))
  const pes_vals  = base_vals.map(v => Math.max(0, v * 0.92))
  const xs        = tariffRange

  const cd = scored.find(d => d.country === country)

  return (
    <div className="space-y-4">
      {/* Delta bars */}
      <div>
        <p className="sec-label">Δ ICG por Choque Arancelario (Top 20 más afectados)</p>
        <Chart height={460} data={[{
          type: 'bar', orientation: 'h',
          x: top20.map(d => d.icg_delta),
          y: top20.map(d => d.country),
          marker: { color: top20.map(d => d.icg_delta < -8 ? COLORS.danger : d.icg_delta < -2 ? COLORS.warn : COLORS.c1), line:{width:0} },
          text: top20.map(d => d.icg_delta.toFixed(2)),
          textposition: 'outside',
          textfont: { family:'IBM Plex Mono', size:8 },
          hovertemplate: '<b>%{y}</b><br>Δ ICG: %{x:.2f}<extra></extra>',
        }]} layout={{
          ...DARK_LAYOUT,
          title:{text:'Δ ICG por Choque Arancelario',font:{size:11,color:'#D0E0F0',family:'IBM Plex Mono'}},
          xaxis:{title:'Δ ICG (puntos)'},
          yaxis:{autorange:'reversed' as const},
          showlegend:false,
          shapes:[{type:'line' as const,x0:0,x1:0,y0:0,y1:1,xref:'x' as const,yref:'paper' as const,
                   line:{color:COLORS.c3,width:1.5}}],
        } as any} />
      </div>

      {/* Trajectory */}
      <div className="flex gap-4 items-start">
        <div className="w-44 flex-shrink-0">
          <p className="sec-label">País a simular</p>
          <select value={country} onChange={e => setCountry(e.target.value)}
            className="w-full bg-panel border border-border text-tx text-xs rounded px-2 py-1.5 font-mono
                       focus:outline-none focus:border-c1 transition-colors mb-3">
            {[...new Set(scored.map(d => d.country))].sort().map(c =>
              <option key={c} value={c}>{c}</option>
            )}
          </select>
          {cd && (
            <div className="insight text-xs space-y-1">
              <p className="font-mono text-c3 text-xs">Análisis</p>
              <p>ICG: <span className="font-mono text-c1">{cd.base_icg_0.toFixed(1)}</span> → <span className="font-mono text-c2">{cd.base_icg.toFixed(1)}</span></p>
              <p>Δ: <span className="font-mono" style={{color: cd.icg_delta < 0 ? COLORS.danger : COLORS.c1}}>{cd.icg_delta > 0 ? '+' : ''}{cd.icg_delta.toFixed(2)}</span></p>
              <p>Expo EE.UU.: <span className="font-mono">{cd.us_export_pct.toFixed(1)}%</span></p>
              <p>Sanciones: <span className="font-mono text-warn">{cd.sanctions_regime}</span></p>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Chart height={380} data={[
            {
              type:'scatter', x:xs, y:opt_vals, mode:'lines',
              line:{color:COLORS.c3,width:1,dash:'dot'}, name:'Optimista',
            },
            {
              type:'scatter', x:xs, y:base_vals, mode:'lines',
              line:{color:COLORS.c2,width:2.5}, name:`Base — ${country}`,
            },
            {
              type:'scatter', x:xs, y:pes_vals, mode:'lines',
              line:{color:COLORS.danger,width:1,dash:'dot'}, name:'Pesimista',
            },
            {
              type:'scatter',
              x:[...xs,...xs.slice().reverse()],
              y:[...opt_vals,...pes_vals.slice().reverse()],
              fill:'toself', fillcolor:'rgba(74,158,202,0.07)',
              line:{color:'rgba(74,158,202,0)'}, name:'Banda', showlegend:false,
            },
          ]} layout={{
            ...DARK_LAYOUT,
            title:{text:`Trayectoria ICG: ${country} vs Escalada Arancelaria`,
                   font:{size:11,color:'#D0E0F0',family:'IBM Plex Mono'}},
            xaxis:{title:'Arancel EE.UU. (%)', range:[0,101], tickvals:[0,25,50,75,100]},
            yaxis:{title:'Base ICG', range:[0,105]},
            legend:{orientation:'h',y:-0.22},
            shapes:[
              {type:'line' as const,x0:0,x1:100,y0:20,y1:20,line:{color:COLORS.danger,width:0.8,dash:'dash'}},
              {type:'line' as const,x0:0,x1:100,y0:55,y1:55,line:{color:COLORS.c1,width:0.8,dash:'dash'}},
            ],
          } as any} />
        </div>
      </div>
    </div>
  )
}

// ── DivergenceDetector ────────────────────────────────────────────────────────
export function DivergenceDetector({ data }: { data: CountryScored[] }) {
  const sorted = [...data].sort((a,b) => b.narrative_capital_divergence - a.narrative_capital_divergence)
  const top8   = sorted.slice(0,8)
  const bot8   = sorted.slice(-8)
  const barData = [...bot8,...top8].sort((a,b) => a.narrative_capital_divergence - b.narrative_capital_divergence)

  const divColors = (v: number) =>
    v < -40 ? COLORS.c1 : v < -15 ? COLORS.c3 : v < 15 ? COLORS.border2 : v < 40 ? COLORS.c2 : COLORS.danger

  return (
    <div className="space-y-4">
      <div className="alert alert-blue text-xs">
        <strong>DIVERGENCE DETECTOR</strong> — Izquierda: capital se mueve antes que la narrativa (señal positiva).
        Derecha: narrativa sin respaldo financiero (posible trampa o señal emergente no cotizada).
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* Scatter */}
        <Chart height={460} data={[
          { type:'scatter',x:[0,100],y:[0,100],mode:'lines',
            line:{color:COLORS.border2,width:1.5,dash:'dot'},name:'Convergencia',showlegend:true },
          {
            type:'scatter', mode:'text+markers',
            x: data.map(d=>d.strategic_signal),
            y: data.map(d=>d.capital_confirmation),
            text: data.map(d=>d.country),
            textposition:'top center' as const,
            textfont:{size:7,color:COLORS.tx,family:'IBM Plex Mono'},
            marker:{
              size: data.map(d=>d.review_urgency/5+7),
              color: data.map(d=>d.narrative_capital_divergence),
              colorscale:[[0,COLORS.c1],[0.4,'#1A3050'],[0.5,'#1E3A5F'],[0.6,'#3A1A1A'],[1,COLORS.danger]],
              cmin:-80,cmax:80,showscale:true,
              line:{color:COLORS.border2,width:0.8},
              colorbar:{title:{text:'Divergencia',font:{size:8,color:COLORS.c3}},
                        len:0.55,thickness:9,bgcolor:COLORS.panel,bordercolor:COLORS.border,
                        tickfont:{family:'IBM Plex Mono',size:7}},
            },
            hovertemplate:'<b>%{text}</b><br>Señal: %{x:.1f}<br>Capital: %{y:.1f}<br>Divergencia: %{marker.color:.1f}<extra></extra>',
            showlegend:false,
          },
        ]} layout={{
          ...DARK_LAYOUT,
          title:{text:'Señal Estratégica vs Confirmación Capital',
                 font:{size:11,color:'#D0E0F0',family:'IBM Plex Mono'}},
          xaxis:{title:'Señal Estratégica',range:[0,105]},
          yaxis:{title:'Confirmación Capital',range:[0,105]},
          annotations:[
            {x:75,y:22,text:'NARRATIVA SIN CAPITAL',showarrow:false,
             font:{size:8,color:COLORS.danger,family:'IBM Plex Mono'},opacity:0.6},
            {x:22,y:78,text:'CAPITAL LIDERA',showarrow:false,
             font:{size:8,color:COLORS.c1,family:'IBM Plex Mono'},opacity:0.6},
          ],
        } as any} />

        {/* Ranking bars */}
        <Chart height={460} data={[{
          type:'bar', orientation:'h',
          x: barData.map(d=>d.narrative_capital_divergence),
          y: barData.map(d=>d.country),
          marker:{color:barData.map(d=>divColors(d.narrative_capital_divergence)),line:{width:0}},
          text:barData.map(d=>d.narrative_capital_divergence.toFixed(1)),
          textposition:'outside',
          textfont:{family:'IBM Plex Mono',size:8},
          hovertemplate:'<b>%{y}</b><br>Divergencia: %{x:.1f}<extra></extra>',
        }]} layout={{
          ...DARK_LAYOUT,
          title:{text:'Casos Extremos de Divergencia',font:{size:11,color:'#D0E0F0',family:'IBM Plex Mono'}},
          xaxis:{title:'Señal − Capital',range:[-90,90]},
          yaxis:{autorange:'reversed' as const, tickfont:{size:9}},
          showlegend:false,
          shapes:[
            {type:'line' as const,x0:0,x1:0,y0:0,y1:1,xref:'x' as const,yref:'paper' as const,line:{color:COLORS.border2,width:1.5}},
            {type:'line' as const,x0:40,x1:40,y0:0,y1:1,xref:'x' as const,yref:'paper' as const,line:{color:COLORS.danger,width:1,dash:'dot'}},
            {type:'line' as const,x0:-40,x1:-40,y0:0,y1:1,xref:'x' as const,yref:'paper' as const,line:{color:COLORS.c1,width:1,dash:'dot'}},
          ],
        } as any} />
      </div>
    </div>
  )
}

// ── ArbitrageMatrix ───────────────────────────────────────────────────────────
const ARBI_THEMES = [
  {value:'minerals',label:'⛏ Minerales Críticos'},
  {value:'chips',   label:'🔬 Semiconductores'},
  {value:'energy',  label:'⚡ Energía'},
  {value:'food',    label:'🌾 Alimentos'},
]

export function ArbitrageMatrix({ theme, onThemeChange, data }: {
  theme: string; onThemeChange: (t: string) => void; data: ArbitrageRow[]
}) {
  const top12 = data.slice(0,12)
  const barColors = top12.map(r => r.asymmetry > 35 ? COLORS.danger : r.asymmetry > 20 ? COLORS.warn : COLORS.c2)

  const dependents = [...new Set(data.map(r=>r.dependent))]
  const suppliers  = [...new Set(data.map(r=>r.supplier))]
  const z = dependents.map(dep =>
    suppliers.map(sup => {
      const row = data.find(r=>r.dependent===dep && r.supplier===sup)
      return row?.asymmetry ?? 0
    })
  )

  const top3 = data.slice(0,3)

  return (
    <div className="space-y-4">
      <div className="alert alert-amber text-xs">
        <strong>STRATEGIC ARBITRAGE MATRIX</strong> — Asimetría = Dependencia% × (1 − Reconocimiento_Mercado/100).
        Rojo intenso = riesgo estructural que el mercado no ha cotizado completamente.
      </div>

      {/* Theme selector */}
      <div className="flex gap-2">
        {ARBI_THEMES.map(t => (
          <button key={t.value} onClick={() => onThemeChange(t.value)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors
              ${theme===t.value ? 'bg-c2/10 border-c2/50 text-c2' : 'border-border text-tx2 hover:border-border2 hover:text-tx'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Heatmap */}
        <Chart height={480} data={[{
          type:'heatmap', z, x:suppliers, y:dependents,
          colorscale:[[0,COLORS.panel],[0.2,'#1A0A0A'],[0.5,COLORS.danger],[1,'#FF8080']],
          zmin:0,zmax:50,
          hovertemplate:'<b>%{y}</b> ← <b>%{x}</b><br>Asimetría: %{z:.1f}<extra></extra>',
          colorbar:{title:{text:'Asimetría\nno cotizada',font:{size:8}},
                    len:0.55,thickness:9,bgcolor:COLORS.panel,bordercolor:COLORS.border,
                    tickfont:{family:'IBM Plex Mono',size:7}},
        }]} layout={{
          ...DARK_LAYOUT,
          title:{text:`Arbitraje de Dependencia — ${ARBI_THEMES.find(t=>t.value===theme)?.label}`,
                 font:{size:11,color:'#D0E0F0',family:'IBM Plex Mono'}},
          xaxis:{title:'Proveedor crítico',tickangle:-35,tickfont:{size:9}},
          yaxis:{title:'País dependiente',tickfont:{size:9},autorange:'reversed' as const},
          margin:{t:60,b:70,l:120,r:80},
        } as any} />

        {/* Bar chart */}
        <div>
          <Chart height={380} data={[{
            type:'bar', orientation:'h',
            x:top12.map(r=>r.asymmetry), y:top12.map(r=>`${r.dependent} ← ${r.supplier}`),
            marker:{color:barColors,line:{width:0}},
            text:top12.map(r=>`${r.dep_pct}% dep · ${r.awareness}% cotizado`),
            textposition:'inside',
            textfont:{family:'IBM Plex Mono',size:7.5,color:'#E2EAF4'},
            hovertemplate:'<b>%{y}</b><br>Dependencia: %{customdata[0]:.0f}%<br>Reconocimiento: %{customdata[1]:.0f}%<br>Asimetría: %{x:.1f}<extra></extra>',
            customdata:top12.map(r=>[r.dep_pct,r.awareness]),
          }]} layout={{
            ...DARK_LAYOUT,
            title:{text:`Top 12 Asimetrías — ${theme}`,font:{size:11,color:'#D0E0F0',family:'IBM Plex Mono'}},
            xaxis:{title:'Asimetría no cotizada',range:[0,58]},
            yaxis:{autorange:'reversed' as const,tickfont:{size:8}},
            showlegend:false,
          } as any} />

          {/* Insights */}
          <div className="insight text-xs space-y-2">
            <p className="font-mono text-c3">ASIMETRÍAS MÁS CRÍTICAS</p>
            {top3.map(r => (
              <p key={`${r.dependent}-${r.supplier}`}>
                <strong>{r.dependent}</strong> obtiene el <strong>{r.dep_pct}%</strong> de sus importaciones
                desde <strong>{r.supplier}</strong> pero el mercado solo cotiza el <strong>{r.awareness}%</strong> de ese riesgo.
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── RegimeRadar ───────────────────────────────────────────────────────────────
const REGIME_PALETTE = [COLORS.c1,COLORS.c2,COLORS.c3,COLORS.danger,COLORS.warn,'#A78BFA','#F97316','#EC4899']

export function RegimeRadar() {
  const panel   = build_temporal_panel()
  const signals = compute_regime_signals(panel)
  const countries = ['United States','China','Russia','India','Vietnam','Taiwan']
  const years   = [2018,2019,2020,2021,2022,2023,2024]

  const traces = countries.map((country,i) => {
    const sub = signals.filter(r=>r.country===country).sort((a,b)=>a.year-b.year)
    return {
      type:'scatter' as const, mode:'lines+markers' as const,
      x:sub.map(r=>r.year), y:sub.map(r=>r.icg),
      name:country,
      line:{color:REGIME_PALETTE[i],width:2.5},
      marker:{size:7,color:REGIME_PALETTE[i],line:{color:COLORS.bg,width:1.5}},
      hovertemplate:`<b>${country}</b><br>Año: %{x}<br>ICG: %{y:.1f}<br>Vel: %{customdata[0]:+.1f}<br>Z: %{customdata[1]:+.2f}<extra></extra>`,
      customdata:sub.map(r=>[r.velocity??0,r.z_velocity??0]),
    }
  })

  // Velocity heatmap
  const velZ = countries.map(c => {
    const sub = signals.filter(r=>r.country===c).sort((a,b)=>a.year-b.year)
    return years.slice(1).map(yr => {
      const row = sub.find(r=>r.year===yr)
      return row?.velocity ?? 0
    })
  })

  const alerts = signals.filter(r=>r.year===2024 && r.inflection!=='Estable')

  return (
    <div className="space-y-4">
      <div className="alert alert-blue text-xs">
        <strong>REGIME CHANGE RADAR</strong> — Los índices miden posición. Esto mide velocidad y aceleración.
        Diamantes = puntos de inflexión detectados (z-score &gt;1.5σ).
        Datos proxy ca. 2018-2024.
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Chart height={480} data={traces as any} layout={{
          ...DARK_LAYOUT,
          title:{text:'Trayectorias ICG 2018-2024',font:{size:11,color:'#D0E0F0',family:'IBM Plex Mono'}},
          xaxis:{title:'Año',tickvals:years,tickformat:'d'},
          yaxis:{title:'BASE_ICG',range:[0,108]},
          shapes:[
            {type:'rect' as const,x0:2020,x1:2020.5,y0:0,y1:108,fillcolor:'rgba(74,158,202,0.05)',line:{width:0}},
            {type:'rect' as const,x0:2022,x1:2022.5,y0:0,y1:108,fillcolor:'rgba(229,62,62,0.05)',line:{width:0}},
          ],
          annotations:[
            {x:2020,y:105,text:'COVID',showarrow:false,font:{size:7.5,color:COLORS.tx2,family:'IBM Plex Mono'}},
            {x:2022,y:105,text:'Ucrania',showarrow:false,font:{size:7.5,color:COLORS.tx2,family:'IBM Plex Mono'}},
          ],
        } as any} />

        <Chart height={480} data={[{
          type:'heatmap',
          z:velZ,
          x:years.slice(1).map(String),
          y:countries,
          colorscale:[
            [0,'#5C0F0F'],[0.25,COLORS.danger],[0.45,'#2A1A0A'],
            [0.5,COLORS.panel],[0.55,'#0A2A1A'],[0.75,COLORS.c1],[1,'#003D2F'],
          ],
          zmin:-12,zmax:12,
          hovertemplate:'<b>%{y}</b> · %{x}<br>Velocidad: %{z:.1f} pts/año<extra></extra>',
          colorbar:{title:{text:'Velocidad\n(pts/año)',font:{size:8}},
                    len:0.55,thickness:9,bgcolor:COLORS.panel,bordercolor:COLORS.border,
                    tickfont:{family:'IBM Plex Mono',size:7}},
        }]} layout={{
          ...DARK_LAYOUT,
          title:{text:'Velocidad de Cambio — Heatmap',font:{size:11,color:'#D0E0F0',family:'IBM Plex Mono'}},
          xaxis:{side:'top' as const,tickfont:{size:10}},
          yaxis:{tickfont:{size:9}},
          margin:{t:75,b:10,l:130,r:80},
        } as any} />
      </div>

      {alerts.length > 0 && (
        <div>
          <p className="sec-label">Alertas de inflexión — 2024</p>
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#0C1525] border-b border-border2">
                  {['País','ICG','Velocidad','Z-score','Señal'].map(h=>(
                    <th key={h} className="px-3 py-2 text-left font-mono text-tx2 tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-panel">
                {alerts.map(a => (
                  <tr key={a.country} className="hover:bg-border/30">
                    <td className="px-3 py-2 font-mono text-tx">{a.country}</td>
                    <td className="px-3 py-2 font-mono text-c1">{a.icg.toFixed(1)}</td>
                    <td className="px-3 py-2 font-mono" style={{color:a.velocity&&a.velocity>0?COLORS.c1:COLORS.danger}}>
                      {(a.velocity??0)>0?'+':''}{(a.velocity??0).toFixed(1)}
                    </td>
                    <td className="px-3 py-2 font-mono text-c2">{(a.z_velocity??0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-warn">{a.inflection}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Methodology ───────────────────────────────────────────────────────────────
export function Methodology() {
  return (
    <div className="grid grid-cols-2 gap-6 text-sm">
      <div className="space-y-4">
        <div>
          <p className="sec-label">Correcciones metodológicas v3.0</p>
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-xs">
              <thead><tr className="bg-[#0C1525] border-b border-border2">
                <th className="px-3 py-2 text-left font-mono text-tx2">Problema anterior</th>
                <th className="px-3 py-2 text-left font-mono text-tx2">Solución v3.0</th>
              </tr></thead>
              <tbody className="divide-y divide-border bg-panel">
                {[
                  ['Min-max (panel-dependiente)','Percentile rank (panel-invariante)'],
                  ['Sanciones lineales','Régimen discreto: none/targeted/sectoral/partial/maximum'],
                  ['√(L×R)/(1+D/100) lineal','Geometric mean + exp(−0.8·D) convexa'],
                  ['Stocks/flows mezclados','Separados en leverage (flows) vs resiliencia (stocks)'],
                  ['Solo capacidad material','+ Fricción regulatoria + Señal + Capital como capas'],
                  ['Noticias → sanctions_score','Noticias → shock_layer (overlay, nunca al ICG base)'],
                ].map(([p,s])=>(
                  <tr key={p} className="hover:bg-border/30">
                    <td className="px-3 py-2 text-danger/80">{p}</td>
                    <td className="px-3 py-2 text-c1">{s}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <p className="sec-label">Fórmula BASE_ICG</p>
          <pre className="bg-panel border border-border rounded p-4 font-mono text-xs text-c2 overflow-x-auto leading-relaxed">
{`ICG = GeoMean(L^wL, R^wR)
      × exp(−0.8 × D/100)
      − Penalidad_Arancel

Penalidad exponencial (γ=0.8):
  D=0%   → factor 1.00 (sin penalidad)
  D=50%  → factor 0.67 (−33%)
  D=100% → factor 0.45 (−55%)`}
          </pre>
        </div>

        <div>
          <p className="sec-label">Sanciones — penalidad discreta</p>
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-xs">
              <thead><tr className="bg-[#0C1525] border-b border-border2">
                <th className="px-3 py-2 text-left font-mono text-tx2">Régimen</th>
                <th className="px-3 py-2 text-right font-mono text-tx2">Penalidad</th>
                <th className="px-3 py-2 text-left font-mono text-tx2">Ejemplos</th>
              </tr></thead>
              <tbody className="divide-y divide-border bg-panel">
                {[
                  ['none','0%','UE, Japón, Australia'],
                  ['targeted','8%','Arabia Saudí, UAE, Turquía'],
                  ['sectoral','22%','China (chips/tech)'],
                  ['partial','45%','Rusia, Venezuela'],
                  ['maximum','78%','Irán, Corea del Norte'],
                ].map(([r,p,e])=>(
                  <tr key={r} className="hover:bg-border/30">
                    <td className="px-3 py-2 font-mono text-c2">{r}</td>
                    <td className="px-3 py-2 font-mono text-right text-danger">{p}</td>
                    <td className="px-3 py-2 text-tx2">{e}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="sec-label">Resultados validados</p>
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-xs">
              <thead><tr className="bg-[#0C1525] border-b border-border2">
                {['País','ICG Base','Arancel 100%','Δ'].map(h=>(
                  <th key={h} className="px-3 py-2 text-center font-mono text-tx2">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-border bg-panel">
                {[
                  ['EE.UU.',  '100.0','100.0','0.0'],
                  ['China',    '74.6', '71.4','−3.2'],
                  ['Rusia',    '68.8', '68.6','−0.2'],
                  ['Alemania', '55.9', '54.1','−1.8'],
                  ['Canadá',   '49.3', '35.3','−14.0 ◄'],
                  ['México',   '25.9', '10.6','−15.3 ◄'],
                  ['Irán',     '23.5', '23.5', '0.0'],
                ].map(([c,b,a,d])=>(
                  <tr key={c} className="hover:bg-border/30">
                    <td className="px-3 py-2 font-mono text-tx">{c}</td>
                    <td className="px-3 py-2 font-mono text-center text-c1">{b}</td>
                    <td className="px-3 py-2 font-mono text-center text-tx2">{a}</td>
                    <td className={`px-3 py-2 font-mono text-center ${d.includes('◄')?'text-danger':'text-tx2'}`}>{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <p className="sec-label">Stack técnico</p>
          <pre className="bg-panel border border-border rounded p-4 font-mono text-xs text-tx2 leading-relaxed">
{`Next.js 14    App Router + RSC
TypeScript    Strict mode
Tailwind CSS  IBM Plex Mono/Sans
Plotly.js     react-plotly.js
Vercel        Edge Network

Scoring:      src/lib/scoring.ts
Database:     src/lib/data.ts (50 países)
Temporal:     src/lib/temporal.ts
Components:   src/components/
No backend — todo client-side`}
          </pre>
        </div>

        <div>
          <p className="sec-label">Fuentes primarias</p>
          <div className="text-xs text-tx2 leading-relaxed space-y-0.5">
            <p>• WB WDI — NY.GDP.MKTP.CD · EG.IMP.CONS.ZS · FI.RES.TOTL.CD</p>
            <p>• UN Comtrade — HS27 + HS26 + HS84</p>
            <p>• OECD TiVA — Supply chain centrality</p>
            <p>• UNCTAD TRAINS — NTM density</p>
            <p>• Wassenaar / NSG / MTCR — Export controls</p>
            <p>• OFAC + EU Sanctions Map — Sanctions regime</p>
            <p>• Brookings / CSIS / CFR / Chatham — Think tank signals</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RankingBar
