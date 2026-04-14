// Temporal panel data for Regime Change Radar
// Proxy data ca. 2018-2024 — replace with real WB WDI historical series in production

export interface TemporalRow {
  country: string
  year: number
  icg: number
  signal: number
  capital: number
  shock: number
  velocity?: number
  acceleration?: number
  z_velocity?: number
  inflection: string
}

const TEMPORAL_DATA: Record<string, { icg: number[]; signal: number[]; capital: number[]; shock: number[] }> = {
  'United States': { icg:[95,96,92,97,100,100,100], signal:[88,88,85,90,92,92,92], capital:[80,82,75,83,85,87,88], shock:[2,2,5,3,2,2,2] },
  'China':         { icg:[82,80,76,78,75,73,72],    signal:[78,80,82,85,88,88,88], capital:[72,70,65,62,55,52,48], shock:[3,4,6,5,5,5,5] },
  'Russia':        { icg:[72,70,68,70,52,45,42],    signal:[60,62,65,68,78,78,78], capital:[45,42,38,40,15,12,10], shock:[4,4,5,4,9,9,9] },
  'Germany':       { icg:[68,67,60,62,58,56,55],    signal:[72,73,70,72,75,75,75], capital:[65,64,58,60,60,60,58], shock:[1,1,3,2,4,4,4] },
  'Taiwan':        { icg:[22,24,25,26,27,27,27],    signal:[55,60,65,70,72,75,78], capital:[55,58,62,65,70,72,72], shock:[4,5,5,6,7,7,8] },
  'India':         { icg:[28,30,28,32,35,38,40],    signal:[55,58,60,65,70,72,75], capital:[40,42,38,45,50,55,58], shock:[2,2,4,3,2,2,2] },
  'Vietnam':       { icg:[18,22,20,24,28,30,32],    signal:[35,40,42,48,50,52,55], capital:[42,48,45,50,55,58,60], shock:[2,2,3,2,2,2,2] },
  'Mexico':        { icg:[30,30,26,27,28,26,25],    signal:[45,46,44,46,50,52,52], capital:[40,38,32,36,38,40,40], shock:[2,2,4,3,3,3,3] },
  'Saudi Arabia':  { icg:[58,55,42,48,55,53,53],    signal:[55,60,58,62,68,68,68], capital:[50,55,38,48,65,72,72], shock:[3,3,5,3,2,2,2] },
  'Netherlands':   { icg:[55,56,50,52,52,51,50],    signal:[58,60,58,62,65,65,65], capital:[55,56,50,55,58,58,58], shock:[1,1,3,2,2,3,3] },
  'Iran':          { icg:[28,25,22,23,24,24,23],    signal:[58,62,60,62,65,65,65], capital:[5,4,3,4,5,5,5],     shock:[8,9,9,9,9,9,9] },
  'Canada':        { icg:[58,57,52,55,52,50,49],    signal:[62,62,60,62,62,62,62], capital:[55,54,48,52,52,52,52], shock:[1,1,3,2,2,2,2] },
}

const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024]

export function build_temporal_panel(): TemporalRow[] {
  const rows: TemporalRow[] = []
  for (const [country, series] of Object.entries(TEMPORAL_DATA)) {
    for (let i = 0; i < YEARS.length; i++) {
      rows.push({
        country, year: YEARS[i],
        icg: series.icg[i], signal: series.signal[i],
        capital: series.capital[i], shock: series.shock[i],
        inflection: 'Estable',
      })
    }
  }
  return rows
}

export function compute_regime_signals(panel: TemporalRow[]): TemporalRow[] {
  const result: TemporalRow[] = []

  for (const country of [...new Set(panel.map(r => r.country))]) {
    const sub = panel.filter(r => r.country === country).sort((a, b) => a.year - b.year)

    // Compute velocity and acceleration
    const withVel = sub.map((row, i) => ({
      ...row,
      velocity: i === 0 ? undefined : row.icg - sub[i - 1].icg,
    }))
    const withAll = withVel.map((row, i) => ({
      ...row,
      acceleration: i < 2 ? undefined : (row.velocity ?? 0) - (withVel[i - 1].velocity ?? 0),
    }))

    // Z-score of velocity
    const vels = withAll.map(r => r.velocity ?? 0).filter((_, i) => i > 0)
    const mu  = vels.reduce((a, b) => a + b, 0) / vels.length
    const std = Math.sqrt(vels.reduce((a, b) => a + (b - mu) ** 2, 0) / vels.length) + 1e-6

    const withZ = withAll.map(row => ({
      ...row,
      z_velocity: row.velocity !== undefined ? (row.velocity - mu) / std : undefined,
    }))

    // Inflection detection
    const final = withZ.map(row => {
      const z = row.z_velocity ?? 0
      const acc = row.acceleration ?? 0
      const vel = row.velocity ?? 0

      let inflection = 'Estable'
      if (z < -2.5)                      inflection = '🔴 Colapso de régimen'
      else if (z < -1.5 || acc < -5)     inflection = '⚠ Deterioro acelerado'
      else if (z > 1.5  && vel > 0)      inflection = '🚀 Ascenso acelerado'
      else if (acc > 5  && vel > 0)      inflection = '📈 Recuperación'

      return { ...row, inflection }
    })

    result.push(...final)
  }

  return result
}
