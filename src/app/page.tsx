'use client'

import { useState, useMemo } from 'react'
import { DATABASE } from '@/lib/data'
import { computeFullSystem, computeBlocScores, computeArbitrageMatrix, type Theme } from '@/lib/scoring'
import Sidebar from '@/components/Sidebar'
import StatCards from '@/components/StatCards'
import { TabNav } from '@/components/TabNav'
import MapChart from '@/components/MapChart'
import RankingBar from '@/components/RankingBar'
import RadarDual from '@/components/RadarDual'
import MaterialVsRegulatory from '@/components/MaterialVsRegulatory'
import ConvergenceHeatmap from '@/components/ConvergenceHeatmap'
import BlocRadar from '@/components/BlocRadar'
import TariffSimulator from '@/components/TariffSimulator'
import DivergenceDetector from '@/components/DivergenceDetector'
import RegimeRadar from '@/components/RegimeRadar'
import ArbitrageMatrix from '@/components/ArbitrageMatrix'
import Methodology from '@/components/Methodology'

export type MapMetric =
  | 'base_icg' | 'leverage' | 'resilience'
  | 'regulatory_power' | 'strategic_signal'
  | 'capital_confirmation' | 'shock_score' | 'icg_delta'

const TABS = [
  { id: 'map',        label: '🌍 Mapa' },
  { id: 'rankings',   label: '📊 Rankings' },
  { id: 'matrix',     label: '🏗 Cap. vs Reg.' },
  { id: 'compare',    label: '🎯 Comparación' },
  { id: 'convergence',label: '🔥 Convergencia' },
  { id: 'blocs',      label: '⬡ Bloques' },
  { id: 'shocks',     label: '⚡ Shocks' },
  { id: 'divergence', label: '🔀 Divergencia' },
  { id: 'regime',     label: '📡 Régimen' },
  { id: 'arbitrage',  label: '♟ Arbitraje' },
  { id: 'method',     label: '📋 Metodología' },
]

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: null,         label: '🌐 Global' },
  { value: 'energy',     label: '⚡ Energía' },
  { value: 'chips',      label: '🔬 Chips' },
  { value: 'minerals',   label: '⛏ Minerales' },
  { value: 'food',       label: '🌾 Alimentos' },
  { value: 'shipping',   label: '🚢 Shipping' },
  { value: 'defense',    label: '🛡 Defensa' },
  { value: 'ai_digital', label: '🤖 IA/Digital' },
]

export default function HomePage() {
  // Controls
  const [activeTab,    setActiveTab]    = useState('map')
  const [theme,        setTheme]        = useState<Theme>(null)
  const [tariff,       setTariff]       = useState(0)
  const [exportCtrl,   setExportCtrl]   = useState(0)
  const [wL,           setWL]           = useState(1.0)
  const [wR,           setWR]           = useState(1.0)
  const [countryA,     setCountryA]     = useState('United States')
  const [countryB,     setCountryB]     = useState('China')
  const [mapMetric,    setMapMetric]    = useState<MapMetric>('base_icg')
  const [rankCol,      setRankCol]      = useState('base_icg')
  const [arbiTheme,    setArbiTheme]    = useState('minerals')
  const [sidebarOpen,  setSidebarOpen]  = useState(true)

  // Compute scored data
  const scored = useMemo(() =>
    computeFullSystem(DATABASE, { theme, wL, wR, tariffShock: tariff, exportControlShock: exportCtrl }),
    [theme, wL, wR, tariff, exportCtrl]
  )

  const blocs = useMemo(() => computeBlocScores(scored), [scored])

  const arbiData = useMemo(() => computeArbitrageMatrix(arbiTheme), [arbiTheme])

  // Quick stats
  const top     = scored[0]
  const bottom  = scored[scored.length - 1]
  const avg     = scored.reduce((s, d) => s + d.base_icg, 0) / scored.length
  const usa     = scored.find(d => d.country === 'United States')
  const nCrit   = scored.filter(d => d.base_icg < 20).length
  const nShock  = scored.filter(d => d.shock_score > 5).length

  const activeThemeName = THEME_OPTIONS.find(t => t.value === theme)?.label ?? '🌐 Global'

  return (
    <div className="flex min-h-screen bg-bg">
      {/* SIDEBAR */}
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        theme={theme}
        setTheme={setTheme}
        themeOptions={THEME_OPTIONS}
        tariff={tariff}
        setTariff={setTariff}
        exportCtrl={exportCtrl}
        setExportCtrl={setExportCtrl}
        wL={wL} setWL={setWL}
        wR={wR} setWR={setWR}
        countryA={countryA} setCountryA={setCountryA}
        countryB={countryB} setCountryB={setCountryB}
      />

      {/* MAIN */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>

        {/* HEADER */}
        <header className="relative bg-panel border-b border-border2 px-6 py-4 scanlines overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs tracking-widest text-c1 uppercase">
                ⬡ GeoIntel Terminal · ICG v3.0
              </span>
              <span className="dot-pulse ml-1" />
              {(tariff > 0 || exportCtrl > 0) && (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-warn/10 text-warn border border-warn/30 ml-2">
                  SHOCK ACTIVO
                </span>
              )}
            </div>
            <h1 className="font-mono text-xl font-semibold text-white tracking-tight">
              Índice de Conversión Geoeconómica
            </h1>
            <p className="text-tx2 text-sm mt-0.5">
              {activeThemeName !== '🌐 Global' ? `Lente temático: ${activeThemeName}` : '50 países · 6 capas · análisis geopolítico multicapa'}
            </p>
            <code className="inline-block mt-2 font-mono text-c2 text-xs bg-c2/5 border-l-2 border-c2 px-3 py-1.5">
              BASE_ICG = GeoMean(L^wL, R^wR) × exp(−0.8 × D/100) − Penalidad_Arancel
            </code>
          </div>
          {/* Decorative corner */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-5 dot-grid" />
        </header>

        {/* ALERT BANNERS */}
        {(tariff > 0 || exportCtrl > 0) && (
          <div className="px-6 pt-3 flex gap-2 flex-wrap">
            {tariff > 0 && (
              <div className="alert alert-amber text-xs">
                ⚡ Arancel EE.UU. activo: <strong>{tariff}%</strong> — Países con alta exposición a EE.UU. más afectados
              </div>
            )}
            {exportCtrl > 0 && (
              <div className="alert alert-red text-xs">
                🔒 Export Controls: intensidad <strong>{exportCtrl}/10</strong> — Reduce supply chain centrality de países objetivo
              </div>
            )}
          </div>
        )}

        {/* STAT CARDS */}
        <div className="px-6 pt-4 pb-2">
          <StatCards
            top={top} bottom={bottom} avg={avg}
            usa={usa} nCrit={nCrit} nShock={nShock}
            tariff={tariff}
          />
        </div>

        {/* TAB NAV */}
        <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {/* TAB CONTENT */}
        <main className="flex-1 px-6 py-4 overflow-auto">

          {activeTab === 'map' && (
            <MapChart
              data={scored}
              metric={mapMetric}
              onMetricChange={setMapMetric}
              tariff={tariff}
            />
          )}

          {activeTab === 'rankings' && (
            <RankingBar
              data={scored}
              col={rankCol}
              onColChange={setRankCol}
              theme={theme}
            />
          )}

          {activeTab === 'matrix' && (
            <MaterialVsRegulatory data={scored} />
          )}

          {activeTab === 'compare' && (
            <RadarDual
              data={scored}
              countryA={countryA}
              countryB={countryB}
            />
          )}

          {activeTab === 'convergence' && (
            <ConvergenceHeatmap data={scored} />
          )}

          {activeTab === 'blocs' && (
            <BlocRadar blocs={blocs as NonNullable<typeof blocs[0]>[]} />
          )}

          {activeTab === 'shocks' && (
            <TariffSimulator
              rawData={DATABASE}
              scored={scored}
              tariff={tariff}
              theme={theme}
            />
          )}

          {activeTab === 'divergence' && (
            <DivergenceDetector data={scored} />
          )}

          {activeTab === 'regime' && (
            <RegimeRadar />
          )}

          {activeTab === 'arbitrage' && (
            <ArbitrageMatrix
              theme={arbiTheme}
              onThemeChange={setArbiTheme}
              data={arbiData}
            />
          )}

          {activeTab === 'method' && (
            <Methodology />
          )}

        </main>

        {/* FOOTER */}
        <footer className="border-t border-border px-6 py-3 text-center">
          <p className="font-mono text-xs text-tx2 tracking-wider">
            GEOINTEL TERMINAL · ICG v3.0 · WB WDI · UN Comtrade · OECD TiVA · UNCTAD · OFAC
          </p>
        </footer>
      </div>
    </div>
  )
}
