/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        aethel: {
          bg: '#FAF7F2',
          surface: '#F3EEE5',
          border: '#D8CDC0',
          amber: '#D99B52',
          gold: '#B07A3A',
          cream: '#4A4032',
          muted: '#8B7D70',
          // Module-specific accent colors
          upload: '#6B8BA4',    // muted blue-gray for photo upload
          letters: '#B388AD',   // muted purple for future letters
          audio: '#C47A6B',     // muted terracotta for sound map
          spotlight: '#D99B52', // amber for spotlight
          filter: '#8BA49C',    // muted sage for location filter
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};

