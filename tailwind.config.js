/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Helvetica Neue"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'sans-serif'
        ],
        mono: [
          '"SF Mono"',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace'
        ],
      },
      colors: {
        // macOS 系统颜色
        macos: {
          blue: '#007AFF',
          green: '#34C759',
          indigo: '#5856D6',
          orange: '#FF9500',
          pink: '#FF2D55',
          purple: '#AF52DE',
          red: '#FF3B30',
          teal: '#5AC8FA',
          yellow: '#FFCC00',
          gray: '#8E8E93',
          'gray-2': '#AEAEB2',
          'gray-3': '#C7C7CC',
          'gray-4': '#D1D1D6',
          'gray-5': '#E5E5EA',
          'gray-6': '#F2F2F7',
        },
        // macOS 背景色
        background: {
          primary: '#FFFFFF',
          secondary: '#F5F5F7',
          tertiary: '#FFFFFF',
        },
        // macOS 文字颜色
        text: {
          primary: '#1D1D1F',
          secondary: '#86868B',
          tertiary: '#A1A1A6',
        },
      },
      boxShadow: {
        // macOS 风格阴影
        'macos': '0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 8px rgba(0, 0, 0, 0.06)',
        'macos-lg': '0 2px 4px rgba(0, 0, 0, 0.04), 0 8px 16px rgba(0, 0, 0, 0.08)',
        'macos-xl': '0 4px 8px rgba(0, 0, 0, 0.04), 0 16px 32px rgba(0, 0, 0, 0.12)',
        'macos-window': '0 22px 70px 4px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        'macos-button': '0 0.5px 1px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.1), inset 0 0.5px 0 rgba(255, 255, 255, 0.25)',
        'macos-button-active': 'inset 0 0.5px 2px rgba(0, 0, 0, 0.2)',
        'macos-input': 'inset 0 0.5px 2px rgba(0, 0, 0, 0.08)',
        'macos-input-focus': '0 0 0 3px rgba(0, 122, 255, 0.15), 0 0 0 1px rgba(0, 122, 255, 0.5)',
      },
      borderRadius: {
        'macos': '10px',
        'macos-sm': '6px',
        'macos-lg': '14px',
        'macos-xl': '20px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-subtle': 'bounceSubtle 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
      },
      transitionTimingFunction: {
        'macos': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'macos-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
