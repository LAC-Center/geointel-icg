// ─────────────────────────────────────────────────────────────────────────────
// ICG SCORING ENGINE — TypeScript port of Python ICG v3.0
// Metodología idéntica: percentile rank, penalidad convexa, 5 capas
// ─────────────────────────────────────────────────────────────────────────────

export type SanctionRegime = 'none' | 'targeted' | 'sectoral' | 'partial' | 'maximum'

export interface CountryRaw {
  country: string
  iso3: string
  region: string
  bloc_primary: string
  export_critical_bn: number
  forex_reserves_bn: number
  energy_net_export: number
  food_self_suff: number
  gdp_bn: number
  supply_chain_centrality: number
  import_strategic_dep: number
  us_export_pct: number
  import_concentration_hhi: number
  sanctions_regime: SanctionRegime
  ntm_density: number
  export_control_score: number
  standards_power: number
  compliance_burden: number
  institutional_signal: number
  think_tank_consensus: number
  strategic_concept_density: number
  fdi_quality: number
  sovereign_capex_signal: number
  multi_alignment: number
  shock_score: number
  theme_energy: number
  theme_chips: number
  theme_minerals: number
  theme_food: number
  theme_shipping: number
  theme_defense: number
  theme_ai: number
}

export interface CountryScored extends CountryRaw {
  sanctions_penalty: number
  leverage: number
  resilience: number
  dependence: number
  base_icg: number
  base_icg_0: number
  icg_delta: number
  icg_cat: string
  regulatory_power: number
  strategic_signal: number
  capital_confirmation: number
  narrative_capital_divergence: number
  shock_percentile: number
  review_urgency: number
}

export type Theme = 'energy' | 'chips' | 'minerals' | 'food' | 'shipping' | 'defense' | 'ai_digital' | null

// ── Sanction penalties ────────────────────────────────────────────────────────
const SANCTION_PENALTY: Record<SanctionRegime, number> = {
  none: 0.00, targeted: 0.08, sectoral: 0.22, partial: 0.45, maximum: 0.78,
}

// ── Percentile rank [0,100] ───────────────────────────────────────────────────
function percentileRank(values: number[]): number[] {
  const n = values.length
  const sorted = [...values].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const ranks = new Array(n)
  sorted.forEach(({ i }, rank) => {
    ranks[i] = ((rank + 1) / n) * 100
  })
  return ranks
}

function prank(arr: number[]): number[] { return percentileRank(arr) }

// ── Helper: apply prank to a field across all countries ───────────────────────
function prankField(data: CountryRaw[], field: keyof CountryRaw): number[] {
  return prank(data.map(d => d[field] as number))
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPA 1: BASE_ICG
// ─────────────────────────────────────────────────────────────────────────────

function computeLeverage(data: CountryRaw[], theme: Theme): number[] {
  const expR   = prank(data.map(d => Math.log1p(d.export_critical_bn)))
  const sccR   = prankField(data, 'supply_chain_centrality')
  const forexR = prank(data.map(d => Math.log1p(d.forex_reserves_bn)))

  return data.map((d, i) => {
    const base = expR[i] * 0.40 + sccR[i] * 0.35 + forexR[i] * 0.25
    const penalty = SANCTION_PENALTY[d.sanctions_regime] * 100 * 0.10

    let score = base - penalty

    // Theme overlay
    if (theme) {
      const themeKey = `theme_${theme}` as keyof CountryRaw
      const themeVals = data.map(d => d[themeKey] as number)
      const themeR = prank(themeVals)
      score = score * 0.75 + themeR[i] * 0.25
    }

    return Math.max(0, Math.min(100, score))
  })
}

function computeResilience(data: CountryRaw[], theme: Theme): number[] {
  const energyR = prank(data.map(d => d.energy_net_export))
  const foodR   = prankField(data, 'food_self_suff').map(v => Math.min(100, v))
  const depInvR = prank(data.map(d => 10 - d.import_strategic_dep))
  const sccR    = prankField(data, 'supply_chain_centrality')

  return data.map((d, i) => {
    let score = energyR[i] * 0.30 + foodR[i] * 0.25 + depInvR[i] * 0.25 + sccR[i] * 0.20

    if (theme) {
      const themeKey = `theme_${theme}` as keyof CountryRaw
      const themeVals = data.map(d => d[themeKey] as number)
      const themeR = prank(themeVals)
      score = score * 0.80 + themeR[i] * 0.20
    }

    return Math.max(0, Math.min(100, score))
  })
}

function computeDependence(data: CountryRaw[]): number[] {
  const usR  = prankField(data, 'us_export_pct')
  const hhiR = prankField(data, 'import_concentration_hhi')
  const maR  = prank(data.map(d => 7 - d.multi_alignment))

  return data.map((_, i) =>
    Math.max(0, Math.min(100, usR[i] * 0.50 + hhiR[i] * 0.30 + maR[i] * 0.20))
  )
}

function rescale(values: number[]): number[] {
  const mn = Math.min(...values)
  const mx = Math.max(...values)
  if (mx === mn) return values.map(() => 50)
  return values.map(v => Math.max(0, Math.min(100, ((v - mn) / (mx - mn)) * 100)))
}

export function computeBaseICG(
  data: CountryRaw[],
  theme: Theme = null,
  wL = 1.0,
  wR = 1.0,
  tariffShock = 0,
): { leverage: number[]; resilience: number[]; dependence: number[]; icg: number[] } {
  const leverage   = computeLeverage(data, theme)
  const resilience = computeResilience(data, theme)
  const dependence = computeDependence(data)

  const gamma = 0.8
  const icgRaw = data.map((d, i) => {
    const L = Math.max(0.1, leverage[i])
    const R = Math.max(0.1, resilience[i])
    const D = dependence[i]

    // Geometric mean + exponential dependence penalty
    const geoMean = Math.pow(Math.pow(L, wL) * Math.pow(R, wR), 1 / (wL + wR))
    const depFactor = Math.exp(-gamma * D / 100)

    // Tariff penalty
    const tariffPen = (d.us_export_pct / 100) * (tariffShock / 100) * 0.70 * 100
    return geoMean * depFactor - tariffPen * 0.20
  })

  return { leverage, resilience, dependence, icg: rescale(icgRaw) }
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2: FRICTION LAYER
// ─────────────────────────────────────────────────────────────────────────────
function computeFrictionLayer(data: CountryRaw[]): number[] {
  const ntmR  = prankField(data, 'ntm_density')
  const ecR   = prankField(data, 'export_control_score')
  const stdR  = prankField(data, 'standards_power')
  const cbInv = prank(data.map(d => 100 - d.compliance_burden))

  return data.map((_, i) =>
    Math.max(0, Math.min(100,
      ntmR[i] * 0.30 + ecR[i] * 0.28 + stdR[i] * 0.22 + cbInv[i] * 0.20
    ))
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPA 3: SIGNAL LAYER
// ─────────────────────────────────────────────────────────────────────────────
function computeSignalLayer(data: CountryRaw[]): number[] {
  const instR = prankField(data, 'institutional_signal')
  const ttR   = prankField(data, 'think_tank_consensus')
  const scdR  = prankField(data, 'strategic_concept_density')

  return data.map((_, i) =>
    Math.max(0, Math.min(100, instR[i] * 0.40 + ttR[i] * 0.35 + scdR[i] * 0.25))
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPA 4: CAPITAL LAYER
// ─────────────────────────────────────────────────────────────────────────────
function computeCapitalLayer(data: CountryRaw[]): number[] {
  const fdiR = prankField(data, 'fdi_quality')
  const capR = prankField(data, 'sovereign_capex_signal')

  return data.map((_, i) =>
    Math.max(0, Math.min(100, fdiR[i] * 0.55 + capR[i] * 0.45))
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SISTEMA COMPLETO
// ─────────────────────────────────────────────────────────────────────────────
export function computeFullSystem(
  data: CountryRaw[],
  options: {
    theme?: Theme
    wL?: number
    wR?: number
    tariffShock?: number
    exportControlShock?: number
  } = {}
): CountryScored[] {
  const { theme = null, wL = 1, wR = 1, tariffShock = 0, exportControlShock = 0 } = options

  // Apply export control shock: reduces supply_chain_centrality of targeted countries
  const processedData = data.map(d => {
    const targeted = ['China', 'Russia', 'Iran', 'North Korea', 'Venezuela']
    if (exportControlShock > 0 && targeted.includes(d.country)) {
      return {
        ...d,
        supply_chain_centrality: Math.max(0,
          d.supply_chain_centrality * (1 - exportControlShock * 0.05)
        ),
      }
    }
    return d
  })

  // Base ICG (no tariff shock — for delta calc)
  const base0 = computeBaseICG(processedData, theme, wL, wR, 0)
  // Base ICG (with tariff shock)
  const base  = computeBaseICG(processedData, theme, wL, wR, tariffShock)

  const friction = computeFrictionLayer(processedData)
  const signal   = computeSignalLayer(processedData)
  const capital  = computeCapitalLayer(processedData)
  const shockPct = prank(processedData.map(d => d.shock_score))

  const ICG_CATS = [
    { max: 18,  label: 'Crítico'    },
    { max: 35,  label: 'Vulnerable' },
    { max: 55,  label: 'Intermedio' },
    { max: 72,  label: 'Fuerte'     },
    { max: 101, label: 'Dominante'  },
  ]

  return processedData.map((d, i) => {
    const icg      = base.icg[i]
    const icg0     = base0.icg[i]
    const signal_i = signal[i]
    const capital_i = capital[i]
    const divergence = signal_i - capital_i
    const urgency = Math.min(100,
      Math.abs(divergence) * 0.65 + d.shock_score * 3.5 * 0.35
    )
    const cat = ICG_CATS.find(c => icg <= c.max)?.label ?? 'Dominante'

    return {
      ...d,
      sanctions_penalty: SANCTION_PENALTY[d.sanctions_regime],
      leverage:    base.leverage[i],
      resilience:  base.resilience[i],
      dependence:  base.dependence[i],
      base_icg:    icg,
      base_icg_0:  icg0,
      icg_delta:   icg - icg0,
      icg_cat:     cat,
      regulatory_power: friction[i],
      strategic_signal: signal_i,
      capital_confirmation: capital_i,
      narrative_capital_divergence: divergence,
      shock_percentile: shockPct[i],
      review_urgency: urgency,
    }
  }).sort((a, b) => b.base_icg - a.base_icg)
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOC ENGINE
// ─────────────────────────────────────────────────────────────────────────────
export const BLOCS: Record<string, string[]> = {
  G7:    ['United States','Germany','Japan','France','Canada','Italy','United Kingdom'],
  BRICS: ['Brazil','Russia','India','China','South Africa','Iran','Egypt','UAE'],
  UE:    ['Germany','France','Poland','Italy','Netherlands','Spain'],
  Quad:  ['United States','Japan','Australia','India'],
  ASEAN: ['Indonesia','Vietnam','Thailand','Malaysia','Philippines'],
  GCC:   ['Saudi Arabia','UAE','Qatar'],
}

export function computeBlocScores(scored: CountryScored[]) {
  return Object.entries(BLOCS).map(([bloc, members]) => {
    const sub = scored.filter(d => members.includes(d.country))
    if (!sub.length) return null
    const avg = (field: keyof CountryScored) =>
      sub.reduce((acc, d) => acc + (d[field] as number), 0) / sub.length

    return {
      bloc,
      n: sub.length,
      base_icg:             avg('base_icg'),
      leverage:             avg('leverage'),
      resilience:           avg('resilience'),
      regulatory_power:     avg('regulatory_power'),
      strategic_signal:     avg('strategic_signal'),
      capital_confirmation: avg('capital_confirmation'),
      shock_score:          avg('shock_score'),
    }
  }).filter(Boolean)
}

// ─────────────────────────────────────────────────────────────────────────────
// THEME ENGINE
// ─────────────────────────────────────────────────────────────────────────────
export const THEME_MAP: Record<string, keyof CountryRaw> = {
  energy:    'theme_energy',
  chips:     'theme_chips',
  minerals:  'theme_minerals',
  food:      'theme_food',
  shipping:  'theme_shipping',
  defense:   'theme_defense',
  ai_digital:'theme_ai',
}

export function getThemeLeaders(scored: CountryScored[], theme: string, n = 8) {
  const col = THEME_MAP[theme]
  if (!col) return scored.slice(0, n)
  return [...scored].sort((a, b) => (b[col] as number) - (a[col] as number)).slice(0, n)
}

// ─────────────────────────────────────────────────────────────────────────────
// ARBITRAGE MATRIX
// ─────────────────────────────────────────────────────────────────────────────
export const BILATERAL_DEPS: Record<string, Record<string, Record<string, number>>> = {
  minerals: {
    'Germany':      { China: 75, Chile: 8, Australia: 8, DRC: 7 },
    'United States':{ China: 58, Australia: 12, Chile: 10, Canada: 12 },
    'Japan':        { China: 68, Australia: 12, Chile: 8, Indonesia: 8 },
    'South Korea':  { China: 80, Australia: 8, Chile: 6, Indonesia: 5 },
    'France':       { China: 72, Chile: 10, Australia: 8, DRC: 8 },
    'India':        { China: 62, Australia: 15, Chile: 10, Indonesia: 10 },
    'Vietnam':      { China: 85, Australia: 8, Chile: 5, Others: 2 },
    'Taiwan':       { China: 78, Japan: 8, Australia: 8, Others: 5 },
  },
  chips: {
    'Germany':    { Taiwan: 52, 'South Korea': 22, 'United States': 15, China: 8 },
    'Japan':      { Taiwan: 60, 'South Korea': 20, 'United States': 15, China: 3 },
    'India':      { Taiwan: 55, China: 20, 'South Korea': 15, 'United States': 8 },
    'Vietnam':    { Taiwan: 45, 'South Korea': 35, China: 12, 'United States': 6 },
    'Netherlands':{ Taiwan: 65, 'South Korea': 18, 'United States': 12, China: 3 },
    'Brazil':     { Taiwan: 42, China: 28, 'South Korea': 18, 'United States': 10 },
  },
  energy: {
    'Germany':     { Norway: 30, 'United States': 18, Netherlands: 12, Russia: 8 },
    'Japan':       { Australia: 28, 'Saudi Arabia': 22, UAE: 12, 'United States': 10 },
    'South Korea': { Australia: 25, 'Saudi Arabia': 22, 'United States': 15, Qatar: 15 },
    'India':       { Iraq: 22, 'Saudi Arabia': 18, UAE: 12, Russia: 15 },
    'Taiwan':      { Australia: 30, 'United States': 20, 'Saudi Arabia': 18, Qatar: 12 },
  },
  food: {
    'Japan':      { 'United States': 25, Australia: 15, Canada: 12, Brazil: 12 },
    'South Korea':{ 'United States': 28, Australia: 18, Brazil: 15, Canada: 12 },
    'China':      { Brazil: 28, 'United States': 20, Argentina: 12, Australia: 10 },
    'Egypt':      { Russia: 35, Ukraine: 25, 'United States': 12, Romania: 10 },
    'Indonesia':  { 'United States': 22, Australia: 18, Brazil: 15, Argentina: 12 },
  },
}

const MARKET_AWARENESS: Record<string, number> = {
  'Germany-China-minerals': 55,
  'France-China-minerals': 50,
  'Japan-China-minerals': 65,
  'South Korea-China-minerals': 60,
  'Germany-Taiwan-chips': 70,
  'Japan-Taiwan-chips': 72,
  'India-China-minerals': 35,
  'Vietnam-China-minerals': 25,
  'Vietnam-Taiwan-chips': 40,
  'Egypt-Russia-food': 45,
  'Egypt-Ukraine-food': 60,
  'Japan-Australia-energy': 75,
  'South Korea-Australia-energy': 72,
  'Taiwan-Australia-energy': 68,
  'India-Russia-energy': 40,
}

export interface ArbitrageRow {
  dependent: string
  supplier: string
  dep_pct: number
  awareness: number
  asymmetry: number
}

export function computeArbitrageMatrix(theme: string): ArbitrageRow[] {
  const deps = BILATERAL_DEPS[theme] ?? {}
  const rows: ArbitrageRow[] = []

  for (const [dependent, suppliers] of Object.entries(deps)) {
    for (const [supplier, dep_pct] of Object.entries(suppliers)) {
      const key = `${dependent}-${supplier}-${theme}`
      const awareness = MARKET_AWARENESS[key] ?? 50
      rows.push({
        dependent, supplier, dep_pct, awareness,
        asymmetry: Math.round(dep_pct * (1 - awareness / 100) * 10) / 10,
      })
    }
  }

  return rows.sort((a, b) => b.asymmetry - a.asymmetry)
}
