import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        wood: '#3a2418',
        cream: '#e8d5a8',
        amber: '#ffb56b',
        burgundy: '#5c1f24',
        forest: '#2d4a3a',
        teal: '#3a5a6b',
        shadow: '#1a1410',
      },
    },
  },
  plugins: [],
}
export default config
