/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-mode="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--color-paper)',
        'paper-2': 'var(--color-paper-2)',
        'paper-3': 'var(--color-paper-3)',
        ink: 'var(--color-ink)',
        'ink-2': 'var(--color-ink-2)',
        muted: 'var(--color-muted)',
        rule: 'var(--color-rule)',
        accent: 'var(--color-accent)',
        'accent-ink': 'var(--color-accent-ink)',
        seal: 'var(--color-seal)',
        'seal-ink': 'var(--color-seal-ink)',
        focus: 'var(--color-focus)',
        error: 'var(--color-error)',
        success: 'var(--color-success)',
      },
      fontFamily: {
        sans: ['var(--font-body)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      transitionTimingFunction: { 'ease-out': 'var(--ease-out)' },
      transitionDuration: { micro: 'var(--dur-micro)', short: 'var(--dur-short)', long: 'var(--dur-long)' },
    },
  },
  plugins: [],
};
