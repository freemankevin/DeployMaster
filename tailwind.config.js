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
        // Railway 风格主色调 - 紫色系
        primary: {
          DEFAULT: '#8B5CF6',      // 主紫色 (Violet-500)
          light: '#A78BFA',        // 浅紫色 (Violet-400)
          dark: '#7C3AED',         // 深紫色 (Violet-600)
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        // Railway 风格强调色 - 粉紫色渐变辅助
        accent: {
          pink: '#EC4899',         // 粉色 (Pink-500)
          purple: '#A855F7',       // 紫色 (Purple-500)
          indigo: '#6366F1',       // 靛蓝 (Indigo-500)
          fuchsia: '#D946EF',      // 品红 (Fuchsia-500)
        },
        // Railway 风格背景色 - 深紫黑色调
        background: {
          primary: '#13111c',      // Railway 主背景色
          secondary: '#1a1825',    // 卡片/面板背景 - 带紫调
          tertiary: '#1f1d2b',     // 输入框/按钮背景 - 紫调灰
          elevated: '#262433',     // 悬浮/高亮背景
          hover: '#2d2a3d',        // hover 状态
          surface: '#181622',      // 表面背景
        },
        // Railway 风格文字颜色
        text: {
          primary: '#FAFAFA',      // 主要文字 - 接近白
          secondary: '#A1A1AA',    // 次要文字 - 灰色
          tertiary: '#71717A',    // 辅助文字
          quaternary: '#52525B',  // 最淡文字
          muted: '#A1A1AA',       // 柔和文字
        },
        // Railway 风格边框色
        border: {
          primary: 'rgba(139, 92, 246, 0.15)',    // 主边框 - 紫色调
          secondary: 'rgba(139, 92, 246, 0.08)',  // 次要边框
          tertiary: 'rgba(139, 92, 246, 0.25)',    // 强调边框
          focus: 'rgba(139, 92, 246, 0.5)',        // 焦点边框
          subtle: 'rgba(255, 255, 255, 0.06)',    // 微妙边框
        },
        // Railway 风格分隔线
        divider: {
          primary: 'rgba(139, 92, 246, 0.12)',
          secondary: 'rgba(139, 92, 246, 0.06)',
        },
        // 状态颜色 - Railway 风格
        status: {
          success: '#22C55E',      // 绿色
          warning: '#F59E0B',      // 橙色
          error: '#EF4444',        // 红色
          info: '#3B82F6',         // 蓝色
          online: '#22C55E',
          offline: '#EF4444',
        },
        // macOS 风格颜色 - 主色调改为紫色系 (Railway 风格)
        macos: {
          blue: '#8B5CF6',        // 改为紫色 (原 #0A84FF)
          green: '#22C55E',       // 保留绿色
          indigo: '#6366F1',      // 靛蓝
          orange: '#F59E0B',      // 橙色
          pink: '#EC4899',        // 粉色
          purple: '#A855F7',      // 紫色
          red: '#EF4444',         // 红色
          teal: '#14B8A6',        // 青色
          yellow: '#EAB308',      // 黄色
          gray: '#98989D',
          'gray-2': '#636366',
          'gray-3': '#48484A',
          'gray-4': '#3A3A3C',
          'gray-5': '#2C2C2E',
          'gray-6': '#1C1C1E',
        },
      },
      backgroundImage: {
        // Railway 风格渐变
        'gradient-primary': 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #EC4899 100%)',
        'gradient-primary-hover': 'linear-gradient(135deg, #A78BFA 0%, #C084FC 50%, #F472B6 100%)',
        'gradient-subtle': 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)',
        'gradient-card': 'linear-gradient(145deg, rgba(139, 92, 246, 0.08) 0%, rgba(168, 85, 247, 0.03) 100%)',
        'gradient-border': 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(236, 72, 153, 0.2) 100%)',
        'gradient-glow': 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        'gradient-mesh': 'radial-gradient(at 40% 20%, rgba(139, 92, 246, 0.12) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(168, 85, 247, 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(236, 72, 153, 0.08) 0px, transparent 50%)',
      },
      boxShadow: {
        // Railway 风格阴影 - 更柔和深邃
        'railway': '0 2px 8px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3)',
        'railway-lg': '0 8px 30px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.35)',
        'railway-xl': '0 16px 48px rgba(0, 0, 0, 0.55), 0 4px 12px rgba(0, 0, 0, 0.4)',
        'railway-window': '0 24px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(139, 92, 246, 0.08)',
        'railway-button': '0 1px 3px rgba(0, 0, 0, 0.3), inset 0 0.5px 0 rgba(255, 255, 255, 0.05)',
        'railway-button-active': 'inset 0 1px 4px rgba(0, 0, 0, 0.4)',
        'railway-input': 'inset 0 1px 3px rgba(0, 0, 0, 0.3)',
        'railway-input-focus': '0 0 0 3px rgba(139, 92, 246, 0.25), 0 0 0 1px rgba(139, 92, 246, 0.5)',
        'railway-card': '0 1px 4px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(139, 92, 246, 0.1)',
        'railway-card-hover': '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(139, 92, 246, 0.2)',
        'railway-dropdown': '0 8px 28px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(139, 92, 246, 0.12)',
        'railway-modal': '0 16px 48px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(139, 92, 246, 0.1)',
        // 紫色发光效果
        'glow-primary': '0 0 20px rgba(139, 92, 246, 0.35)',
        'glow-primary-sm': '0 0 12px rgba(139, 92, 246, 0.25)',
        'glow-primary-lg': '0 0 30px rgba(139, 92, 246, 0.45)',
        'glow-pink': '0 0 20px rgba(236, 72, 153, 0.35)',
        'glow-success': '0 0 16px rgba(34, 197, 94, 0.3)',
        'glow-error': '0 0 16px rgba(239, 68, 68, 0.3)',
        'glow-warning': '0 0 16px rgba(245, 158, 11, 0.3)',
        // 保留 macOS 风格阴影 - 发光效果改为紫色
        'macos': '0 2px 6px rgba(0, 0, 0, 0.25), 0 1px 2px rgba(0, 0, 0, 0.15)',
        'macos-lg': '0 8px 24px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.2)',
        'macos-xl': '0 16px 48px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.25)',
        'macos-window': '0 24px 80px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(139, 92, 246, 0.05)',
        'macos-button': '0 1px 2px rgba(0, 0, 0, 0.2), inset 0 0.5px 0 rgba(255, 255, 255, 0.06)',
        'macos-button-active': 'inset 0 1px 3px rgba(0, 0, 0, 0.35)',
        'macos-input': 'inset 0 1px 2px rgba(0, 0, 0, 0.25)',
        'macos-input-focus': '0 0 0 3px rgba(139, 92, 246, 0.2), 0 0 0 1px rgba(139, 92, 246, 0.4)',
        'macos-card': '0 1px 3px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(139, 92, 246, 0.08)',
        'macos-card-hover': '0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(139, 92, 246, 0.15)',
        'macos-dropdown': '0 8px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(139, 92, 246, 0.1)',
        'macos-modal': '0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(139, 92, 246, 0.08)',
        'glow-blue': '0 0 16px rgba(139, 92, 246, 0.3)',
        'glow-green': '0 0 16px rgba(34, 197, 94, 0.25)',
        'glow-red': '0 0 16px rgba(239, 68, 68, 0.25)',
        'glow-purple': '0 0 16px rgba(168, 85, 247, 0.3)',
      },
      borderRadius: {
        'railway': '12px',
        'railway-sm': '8px',
        'railway-lg': '16px',
        'railway-xl': '24px',
        // 保留 macOS 风格圆角
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
        'glow-purple': 'glowPurple 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
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
          '0%': { boxShadow: '0 0 5px rgba(139, 92, 246, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)' },
        },
        glowPurple: {
          '0%': { boxShadow: '0 0 8px rgba(139, 92, 246, 0.3)' },
          '100%': { boxShadow: '0 0 24px rgba(139, 92, 246, 0.5)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      transitionTimingFunction: {
        'railway': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'railway-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
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