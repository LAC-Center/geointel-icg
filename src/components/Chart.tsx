'use client'

import dynamic from 'next/dynamic'
import type { Data, Layout, Config } from 'plotly.js'

// Dynamic import to avoid SSR issues with Plotly
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export const COLORS = {
  bg:      '#05080F',
  panel:   '#090E1A',
  border:  '#162035',
  border2: '#1E3050',
  tx:      '#B8CCDF',
  tx2:     '#6A8BA8',
  c1:      '#00C9A7',
  c2:      '#F0A500',
  c3:      '#4A9ECA',
  danger:  '#E53E3E',
  warn:    '#DD6B20',
}

export const ICG_COLORSCALE: [number, string][] = [
  [0.00, '#1A0000'], [0.15, '#6B0F0F'], [0.28, '#C0390A'],
  [0.42, '#D4820A'], [0.55, '#B8B800'], [0.70, '#3DB87A'],
  [0.85, '#00C9A7'], [1.00, '#00E5CC'],
]

export const DARK_LAYOUT: Partial<Layout> = {
  paper_bgcolor: 'transparent',
  plot_bgcolor:  COLORS.panel,
  font: { family: 'IBM Plex Mono, monospace', color: COLORS.tx, size: 10 },
  xaxis: { gridcolor: COLORS.border, zerolinecolor: COLORS.border2, linecolor: COLORS.border },
  yaxis: { gridcolor: COLORS.border, zerolinecolor: COLORS.border2, linecolor: COLORS.border },
  legend: { bgcolor: COLORS.panel, bordercolor: COLORS.border2, borderwidth: 1, font: { size: 9 } },
  margin: { t: 45, b: 40, l: 50, r: 25 },
}

export const PLOT_CONFIG: Partial<Config> = {
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
  responsive: true,
}

interface ChartProps {
  data: Data[]
  layout?: Partial<Layout>
  height?: number
  className?: string
}

export function Chart({ data, layout = {}, height = 460, className = '' }: ChartProps) {
  return (
    <div className={`w-full ${className}`}>
      <Plot
        data={data}
        layout={{ ...DARK_LAYOUT, height, ...layout } as Layout}
        config={PLOT_CONFIG}
        style={{ width: '100%' }}
        useResizeHandler
      />
    </div>
  )
}

export default Chart
