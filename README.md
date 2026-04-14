# ⬡ GeoIntel Terminal — ICG v3.0 · Next.js + Vercel

Reescritura completa en **Next.js 14 + TypeScript + Tailwind CSS** del dashboard ICG v3.0, optimizado para despliegue en **Vercel**.

Toda la lógica de scoring está portada a TypeScript puro — sin servidor Python, sin dependencias de Streamlit. Se ejecuta 100% en el cliente (browser).

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript strict |
| Estilos | Tailwind CSS + IBM Plex Mono/Sans |
| Visualizaciones | Plotly.js (react-plotly.js) |
| Scoring | TypeScript puro (client-side) |
| Despliegue | Vercel |

---

## Instalación local

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/geointel-icg.git
cd geointel-icg

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

Abre `http://localhost:3000`.

---

## Despliegue en Vercel

### Opción A — Deploy directo desde GitHub (recomendado)

1. Sube el repositorio a GitHub
2. Ve a [vercel.com](https://vercel.com) → New Project
3. Importa tu repositorio
4. Framework: **Next.js** (se detecta automáticamente)
5. Clic en **Deploy**

No necesitas configurar nada más. El `vercel.json` incluido configura todo.

### Opción B — Vercel CLI

```bash
npm install -g vercel
vercel
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── layout.tsx      # Layout global, fuentes IBM Plex
│   ├── page.tsx        # Dashboard principal, toda la UI
│   └── globals.css     # Variables CSS, Tailwind base
├── components/
│   ├── Chart.tsx       # Wrapper Plotly con dark theme
│   ├── Sidebar.tsx     # Panel de controles
│   ├── StatCards.tsx   # Métricas rápidas + TabNav
│   ├── MapChart.tsx    # Mapa coroplético global
│   └── Components.tsx  # Todos los demás componentes
└── lib/
    ├── scoring.ts      # Motor ICG completo (TypeScript)
    ├── data.ts         # Base de datos 50 países
    └── temporal.ts     # Panel histórico 2018-2024
```

---

## Módulos del dashboard

| Tab | Función |
|---|---|
| 🌍 Mapa Global | Coroplético con 8 métricas |
| 📊 Rankings | Ranking por dimensión + líderes temáticos |
| 🏗 Cap. vs Reg. | Matriz capacidad material × poder regulatorio |
| 🎯 Comparación | Radar 6D + tabla dimensión a dimensión |
| 🔥 Convergencia | Heatmap narrativa × capital × resiliencia |
| ⬡ Bloques | G7 vs BRICS vs UE vs Quad vs ASEAN vs GCC |
| ⚡ Shocks | Simulador aranceles + export controls + trayectoria |
| 🔀 Divergencia | Detector narrativa vs capital |
| 📡 Régimen | Velocidad y aceleración ICG 2018-2024 |
| ♟ Arbitraje | Matriz asimetrías de dependencia bilateral |
| 📋 Metodología | Fórmulas, correcciones, stack técnico |

---

## Sin API keys necesarias

Toda la app funciona offline. Los datos son proxies documentados ca. 2022-2024 incluidos directamente en `src/lib/data.ts`.

---

## Licencia

MIT
