'use client'

import { type Theme } from '@/lib/scoring'
import { ALL_COUNTRIES } from '@/lib/data'

interface Props {
  open: boolean
  onToggle: () => void
  theme: Theme
  setTheme: (t: Theme) => void
  themeOptions: { value: Theme; label: string }[]
  tariff: number
  setTariff: (v: number) => void
  exportCtrl: number
  setExportCtrl: (v: number) => void
  wL: number; setWL: (v: number) => void
  wR: number; setWR: (v: number) => void
  countryA: string; setCountryA: (v: string) => void
  countryB: string; setCountryB: (v: string) => void
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-xs tracking-widest uppercase text-tx2 mb-1.5">{children}</p>
}

function Divider() {
  return <div className="border-t border-border my-4" />
}

function SliderRow({ label, value, min, max, step, onChange, unit = '' }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; unit?: string
}) {
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-tx2">{label}</span>
        <span className="font-mono text-xs text-c2">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 bg-border2 rounded appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-c2
                   [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  )
}

export default function Sidebar({
  open, onToggle, theme, setTheme, themeOptions,
  tariff, setTariff, exportCtrl, setExportCtrl,
  wL, setWL, wR, setWR,
  countryA, setCountryA, countryB, setCountryB,
}: Props) {
  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 w-8 h-8 flex items-center justify-center
                   bg-panel border border-border2 rounded text-tx2 hover:text-c1
                   hover:border-c1 transition-colors text-lg"
        aria-label="Toggle sidebar"
      >
        {open ? '‹' : '›'}
      </button>

      {/* Sidebar panel */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-[#040710] border-r border-border
        z-40 overflow-y-auto transition-transform duration-300 pt-14 pb-6 px-4
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="mb-5">
          <p className="font-mono text-xs text-c1 tracking-widest">⬡ GEOINTEL</p>
          <p className="font-mono text-xs text-tx2 tracking-wider">ICG v3.0 · TERMINAL</p>
        </div>

        {/* Theme Engine */}
        <Label>🎨 Theme Engine</Label>
        <div className="grid grid-cols-2 gap-1 mb-1">
          {themeOptions.map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => setTheme(opt.value)}
              className={`text-xs px-2 py-1.5 rounded border transition-colors text-left
                ${theme === opt.value
                  ? 'bg-c1/10 border-c1/50 text-c1 font-mono'
                  : 'bg-panel border-border text-tx2 hover:border-border2 hover:text-tx'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Divider />

        {/* Tariff Simulator */}
        <Label>🇺🇸 Simulador de Shocks</Label>
        <SliderRow
          label="Arancel EE.UU." value={tariff} min={0} max={100} step={5}
          onChange={setTariff} unit="%"
        />
        <SliderRow
          label="Export Controls" value={exportCtrl} min={0} max={10} step={0.5}
          onChange={setExportCtrl} unit="/10"
        />

        <Divider />

        {/* Weights */}
        <Label>⚖️ Pesos ICG Base</Label>
        <SliderRow label="Peso Apalancamiento" value={wL} min={0.5} max={2} step={0.1} onChange={setWL} />
        <SliderRow label="Peso Resiliencia"    value={wR} min={0.5} max={2} step={0.1} onChange={setWR} />

        <Divider />

        {/* Comparison */}
        <Label>🎯 Comparación Dual</Label>
        <div className="mb-2">
          <p className="text-xs text-c1 mb-1">País A</p>
          <select
            value={countryA}
            onChange={e => setCountryA(e.target.value)}
            className="w-full bg-panel border border-border text-tx text-xs
                       rounded px-2 py-1.5 font-mono focus:outline-none
                       focus:border-c1 transition-colors"
          >
            {ALL_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <p className="text-xs text-c2 mb-1">País B</p>
          <select
            value={countryB}
            onChange={e => setCountryB(e.target.value)}
            className="w-full bg-panel border border-border text-tx text-xs
                       rounded px-2 py-1.5 font-mono focus:outline-none
                       focus:border-c2 transition-colors"
          >
            {ALL_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <Divider />

        {/* Sources */}
        <div className="text-xs text-tx2 leading-relaxed">
          <p className="font-mono text-c3 mb-1 text-xs">Fuentes</p>
          WB WDI · UN Comtrade<br />
          OECD TiVA · UNCTAD<br />
          IMF · G20 · OFAC<br />
          Brookings/CSIS/CFR<br />
          <br />
          <em>Modo offline-first activo</em>
        </div>
      </aside>
    </>
  )
}
