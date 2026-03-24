/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Inter"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"Roboto"',
          '"Helvetica Neue"',
          '"Arial"',
          'sans-serif'
        ],
        mono: [
          '"JetBrains Mono"',
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
        // macOS 暗模式系统颜色
        macos: {
          blue: '#0A84FF',
          green: '#30D158',
          indigo: '#5E5CE6',
          orange: '#FF9F0A',
          pink: '#FF375F',
          purple: '#BF5AF2',
          red: '#FF453A',
          teal: '#64D2FF',
          yellow: '#FFD60A',
          // 暗模式灰色系
          gray: '#98989D',
          'gray-2': '#636366',
          'gray-3': '#48484A',
          'gray-4': '#3A3A3C',
          'gray-5': '#2C2C2E',
          'gray-6': '#1C1C1E',
        },
        // macOS 暗模式背景色
        background: {
          primary: '#1C1C1E',
          secondary: '#2C2C2E',
          tertiary: '#3A3A3C',
          elevated: '#48484A',
        },
        // macOS 暗模式文字颜色
        text: {
          primary: '#FFFFFF',
          secondary: '#EBEBF5',
          tertiary: '#8E8E93',
          quaternary: '#636366',
        },
        // 暗模式边框色
        border: {
          primary: 'rgba(255, 255, 255, 0.1)',
          secondary: 'rgba(255, 255, 255, 0.05)',
          focus: 'rgba(10, 132, 255, 0.5)',
        },
        // 暗模式分隔线
        divider: {
          primary: 'rgba(255, 255, 255, 0.12)',
          secondary: 'rgba(255, 255, 255, 0.06)',
        },
      },
      boxShadow: {
        // macOS 暗模式风格阴影
        'macos': '0 1px 3px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)',
        'macos-lg': '0 4px 8px rgba(0, 0, 0, 0.4), 0 12px 28px rgba(0, 0, 0, 0.35)',
        'macos-xl': '0 8px 16px rgba(0, 0, 0, 0.4), 0 20px 40px rgba(0, 0, 0, 0.4)',
        'macos-window': '0 22px 70px 4px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'macos-button': '0 0.5px 1px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2), inset 0 0.5px 0 rgba(255, 255, 255, 0.08)',
        'macos-button-active': 'inset 0 0.5px 2px rgba(0, 0, 0, 0.4)',
        'macos-input': 'inset 0 0.5px 2px rgba(0, 0, 0, 0.3)',
        'macos-input-focus': '0 0 0 3px rgba(10, 132, 255, 0.25), 0 0 0 1px rgba(10, 132, 255, 0.5)',
        'macos-card': '0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'macos-card-hover': '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'macos-dropdown': '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'macos-modal': '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        // 发光效果
        'glow-blue': '0 0 20px rgba(10, 132, 255, 0.3)',
        'glow-green': '0 0 20px rgba(48, 209, 88, 0.3)',
        'glow-red': '0 0 20px rgba(255, 69, 58, 0.3)',
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
        'glow': 'glow 2s ease-in-out infinite alternate',
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
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(10, 132, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(10, 132, 255, 0.4)' },
        },
      },
      transitionTimingFunction: {
        'macos': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'macos-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}