/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Plotly needs this to avoid SSR issues
  transpilePackages: ['react-plotly.js', 'plotly.js'],
}

module.exports = nextConfig
