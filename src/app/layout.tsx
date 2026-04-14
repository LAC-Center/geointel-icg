import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'
import './globals.css'

const ibmMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  variable: '--font-mono',
})
const ibmSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'GeoIntel Terminal · ICG v3.0',
  description: 'Índice de Conversión Geoeconómica — Plataforma de inteligencia geoeconómica multicapa',
  icons: { icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⬡</text></svg>' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${ibmMono.variable} ${ibmSans.variable}`}>
      <body className="bg-bg text-tx font-sans antialiased">{children}</body>
    </html>
  )
}
