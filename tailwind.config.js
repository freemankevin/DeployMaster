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
        heading: [
          '"Inter Tight"',
          '"Inter"',
          'system-ui',
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
        // ============================================
        // Cockpit Design Spec - Railway 风格配色系统
        // 核心原则：节制色彩、深邃背景、微妙边框
        // ============================================

        // 背景层级 - 从最深到最浅，形成 4 档层次
        bg: {
          base: '#0B0D0F',       // 页面底色 - 最深邃
          surface: '#141518',    // 侧边栏、导航
          elevated: '#1C1E21',   // 卡片背景
          overlay: '#242629',    // 下拉菜单、Modal
          hover: '#1C1E21',      // hover 状态（与 elevated 相同）
        },

        // 文字层级 - 高对比度，清晰易读
        text: {
          primary: '#EFEFEF',    // 主要内容、标题
          secondary: '#A3A3A3',  // 辅助说明、副标题
          tertiary: '#636363',   // 时间戳、元信息、占位符
          disabled: '#3D3F42',   // 禁用状态
        },

        // 边框 - 白色低透明度，微妙区分层次
        border: {
          subtle: 'rgba(255, 255, 255, 0.06)',   // 默认分割线
          default: 'rgba(255, 255, 255, 0.10)',  // 卡片边框
          strong: 'rgba(255, 255, 255, 0.16)',   // 交互 hover 边框
        },

        // Accent 色（品牌色）- 仅用于主要 CTA 按钮、选中状态
        accent: {
          DEFAULT: '#A855F7',      // Purple-500
          hover: '#9333EA',        // Purple-600
          muted: 'rgba(168, 85, 247, 0.15)',
        },

        // 语义色（状态专用）- 颜色只用于传递状态
        semantic: {
          // 成功 / Running
          success: '#4ADE80',
          successMuted: 'rgba(74, 222, 128, 0.12)',
          successText: '#86EFAC',

          // 警告 / Degraded
          warning: '#FACC15',
          warningMuted: 'rgba(250, 204, 21, 0.12)',
          warningText: '#FDE047',

          // 错误 / Failed
          error: '#F87171',
          errorMuted: 'rgba(248, 113, 113, 0.12)',
          errorText: '#FCA5A5',

          // 信息 / Deploying
          info: '#60A5FA',
          infoMuted: 'rgba(96, 165, 250, 0.12)',
          infoText: '#93C5FD',

          // 中性 / Idle / Stopped
          neutral: '#71717A',
          neutralMuted: 'rgba(113, 113, 122, 0.12)',
          neutralText: '#A1A1AA',
        },

        // 保留状态色简写（向后兼容）
        status: {
          success: '#4ADE80',
          warning: '#FACC15',
          error: '#F87171',
          info: '#60A5FA',
          online: '#4ADE80',
          offline: '#F87171',
        },

        // 间距 Token
        space: {
          '1': '4px',
          '2': '8px',
          '3': '12px',
          '4': '16px',
          '5': '20px',
          '6': '24px',
          '8': '32px',
          '12': '48px',
          '16': '64px',
        },
      },
      boxShadow: {
        // Railway 风格阴影 - 极度克制，几乎不用
        'card': '0 1px 4px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.4)',
        'dropdown': '0 8px 28px rgba(0, 0, 0, 0.5)',
        'modal': '0 16px 48px rgba(0, 0, 0, 0.55)',
        // 焦点环 - 仅用于 focus 状态
        'focus': '0 0 0 3px rgba(168, 85, 247, 0.2)',
        'focus-error': '0 0 0 3px rgba(248, 113, 113, 0.2)',
        'focus-success': '0 0 0 3px rgba(74, 222, 128, 0.2)',
      },
      borderRadius: {
        'sm': '8px',     // 小组件
        'DEFAULT': '10px', // 卡片、按钮（默认）
        'md': '12px',    // 大卡片
        'lg': '16px',    // Modal
        'xl': '24px',    // 大型容器
        'badge': '20px', // 状态徽标
      },
      fontSize: {
        'xs': ['11px', { lineHeight: '1.4', fontWeight: '500' }],   // 标签、badge
        'sm': ['13px', { lineHeight: '1.5', fontWeight: '400' }],   // 元信息、时间戳
        'base': ['14px', { lineHeight: '1.5', fontWeight: '400' }], // 正文（主力字号）
        'md': ['16px', { lineHeight: '1.4', fontWeight: '500' }],   // 卡片标题
        'lg': ['20px', { lineHeight: '1.3', fontWeight: '500' }],   // 页面标题
        'xl': ['28px', { lineHeight: '1.2', fontWeight: '500' }],   // 仅用于 Hero
      },
      animation: {
        'pulse-status': 'pulseStatus 1.5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.15s ease-out',
      },
      keyframes: {
        pulseStatus: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      backdropBlur: {
        'xs': '2px',
        'modal': '8px',
      },
    },
  },
  plugins: [],
}