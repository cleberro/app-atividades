/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      colors: {
        'bg-base': 'var(--bg-base)',
        'bg-surface': 'var(--bg-surface)',
        'bg-elevated': 'var(--bg-elevated)',
        'accent-primary': 'var(--accent-primary)',
        'accent-secondary': 'var(--accent-secondary)',
        'status-pendente': 'var(--status-pendente)',
        'status-andamento': 'var(--status-andamento)',
        'status-bloqueada': 'var(--status-bloqueada)',
        'status-concluida': 'var(--status-concluida)',
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
      },
      borderRadius: {
        card: '12px',
        pill: '9999px',
      },
      boxShadow: {
        soft: '0 4px 16px rgba(0, 0, 0, 0.25)',
        lift: '0 8px 24px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
};
