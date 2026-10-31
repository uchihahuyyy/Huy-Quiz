/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dc: {
          bg: '#111214',         // Discord 2024 deep dark
          sidebar: '#1E1F22',    // Server / sidebar dark
          card: '#2B2D31',       // Embed / component card
          chat: '#313338',       // Main content area
          elevated: '#383A40',   // Hover / elevated elements
          border: '#3F4147',     // Discord standard borders
          borderLight: '#4E5058',
          input: '#1E1F22',      // Chat bar / inputs
          blurple: '#5865F2',    // Discord Brand Blurple
          blurpleHover: '#4752C4',
          blurpleActive: '#3C45A5',
          green: '#23A55A',      // Online green
          yellow: '#F0B232',     // Idle yellow / warning
          red: '#F23F43',        // DND red / error
          nitro: '#F47B67',      // Nitro pink/orange
          textPrimary: '#F2F3F5',
          textNormal: '#DBDEE1',
          textMuted: '#949BA4',
          textChannel: '#80848E',
          link: '#00A8FC',
        },
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        'dc-modal': '0 0 0 1px rgba(32,34,37,0.6), 0 16px 32px 0 rgba(0,0,0,0.8)',
        'dc-card': '0 2px 10px 0 rgba(0,0,0,0.4)',
        'dc-glow': '0 0 20px -3px rgba(88, 101, 242, 0.45)',
      },
    },
  },
  plugins: [],
}
