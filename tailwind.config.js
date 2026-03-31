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

        // 背景层级 - 4档层次，从最深到最浅
        bg: {
          base: '#0B0D0F',       // 页面底色 - 最深邃
          surface: '#141518',    // 侧边栏、导航
          elevated: '#1C1E21',   // 卡片背景
          overlay: '#242629',    // 下拉菜单、Modal、输入框
        },

        // 兼容旧类名：background-* 系列
        background: {
          primary: '#0B0D0F',
          secondary: '#141518',
          tertiary: '#1C1E21',
          hover: '#242629',
        },

        // 文字层级 - 高对比度，清晰易读
        text: {
          primary: '#EFEFEF',
          secondary: '#A3A3A3',
          tertiary: '#636363',
          disabled: '#3D3F42',
        },

        // 边框层级 - Ghost Border (rgba 透明度)
        border: {
          subtle: 'rgba(255, 255, 255, 0.04)',
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.12)',
          focus: 'rgba(255, 255, 255, 0.18)',
          // 兼容旧类名
          primary: 'rgba(255, 255, 255, 0.08)',
          secondary: 'rgba(255, 255, 255, 0.12)',
          tertiary: 'rgba(255, 255, 255, 0.18)',
        },

        // Accent 色（品牌色）- 仅用于主要 CTA、选中状态
        accent: {
          DEFAULT: '#A855F7',
          hover: '#9333EA',
          muted: 'rgba(168, 85, 247, 0.12)',
          subtle: 'rgba(168, 85, 247, 0.06)',
        },

        // 语义色（状态专用）- 颜色只用于传递状态
        semantic: {
          success: '#4ADE80',
          successMuted: 'rgba(74, 222, 128, 0.12)',
          successSubtle: 'rgba(74, 222, 128, 0.06)',
          successText: '#86EFAC',

          warning: '#FACC15',
          warningMuted: 'rgba(250, 204, 21, 0.12)',
          warningSubtle: 'rgba(250, 204, 21, 0.06)',
          warningText: '#FDE047',

          error: '#F87171',
          errorMuted: 'rgba(248, 113, 113, 0.12)',
          errorSubtle: 'rgba(248, 113, 113, 0.06)',
          errorText: '#FCA5A5',

          info: '#60A5FA',
          infoMuted: 'rgba(96, 165, 250, 0.12)',
          infoSubtle: 'rgba(96, 165, 250, 0.06)',
          infoText: '#93C5FD',

          neutral: '#71717A',
          neutralMuted: 'rgba(113, 113, 122, 0.12)',
          neutralSubtle: 'rgba(113, 113, 122, 0.06)',
          neutralText: '#A1A1AA',
        },

        // 状态色简写（向后兼容）
        status: {
          success: '#4ADE80',
          warning: '#FACC15',
          error: '#F87171',
          info: '#60A5FA',
          online: '#4ADE80',
          offline: '#F87171',
        },

        // macOS 风格颜色（兼容旧代码）
        macos: {
          blue: '#60A5FA',
          green: '#4ADE80',
          purple: '#A855F7',
          red: '#F87171',
          yellow: '#FACC15',
          orange: '#FF9F0A',
          teal: '#2DD4BF',     // IPv4 Address 图标
          pink: '#F472B6',     // Password 图标
          indigo: '#818CF8',   // Copy mode hint 图标
          gray: '#6B7280',     // macos-gray-2 hover
        },
      },
      // ============================================
      // 阴影系统 - Railway 规范：极度克制
      // 仅用于 Modal、Dropdown 等浮层组件
      // ============================================
      boxShadow: {
        'none': 'none',
        'sm': 'none',
        'DEFAULT': 'none',
        'md': 'none',
        'lg': 'none',
        'xl': 'none',
        '2xl': 'none',
        // Modal 专用阴影 - 仅此一处使用
        'modal': '0 16px 48px rgba(0, 0, 0, 0.4)',
        // Dropdown 专用阴影
        'dropdown': '0 8px 28px rgba(0, 0, 0, 0.35)',
        // 兼容旧代码
        'card': 'none',
        'card-hover': 'none',
        'focus': 'none',
        'focus-error': 'none',
        'focus-success': 'none',
        'macos-button': 'none',
        'macos-button-active': 'none',
        'macos-input': 'none',
        'macos-input-focus': 'none',
        'glow-blue': 'none',
        'glow-purple': 'none',
      },
      // ============================================
      // 圆角系统 - Railway 风格偏好较小圆角
      // ============================================
      borderRadius: {
        'none': '0',
        'sm': '6px',      // 小组件：badge、checkbox
        'DEFAULT': '8px', // 默认：按钮、输入框
        'md': '10px',     // 中等：卡片
        'lg': '12px',     // 大型：Modal、面板
        'xl': '16px',     // 特大：容器
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
        'badge': '100px', // 状态徽标
      },
      // ============================================
      // 字号系统 - Railway 风格偏好较小字号
      // ============================================
      fontSize: {
        'xs': ['11px', { lineHeight: '1.4', fontWeight: '500' }],
        'sm': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        'base': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'md': ['16px', { lineHeight: '1.4', fontWeight: '500' }],
        'lg': ['20px', { lineHeight: '1.3', fontWeight: '500' }],
        'xl': ['28px', { lineHeight: '1.2', fontWeight: '500' }],
      },
      // ============================================
      // 间距系统 - 4px 基础单位
      // ============================================
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '3.5': '14px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '9': '36px',
        '10': '40px',
        '11': '44px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
        '28': '112px',
        '32': '128px',
      },
      // ============================================
      // 动画系统 - Railway 风格偏好快速响应
      // ============================================
      animation: {
        'none': 'none',
        'pulse-status': 'pulseStatus 1.5s ease-in-out infinite',
        'fade-in': 'fadeIn 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        'spin': 'spin 1s linear infinite',
        'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce': 'bounce 1s infinite',
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
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      // ============================================
      // 过渡时长 - Railway 风格偏好快速
      // ============================================
      transitionDuration: {
        'fast': '100ms',
        'normal': '150ms',
        'slow': '200ms',
        'slower': '300ms',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
        'macos': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
      // ============================================
      // 边框宽度 - Railway 规范使用 0.5px
      // ============================================
      borderWidth: {
        'DEFAULT': '0.5px',
        '0': '0',
        '1': '0.5px',
        '2': '1px',
        '3': '2px',
        '4': '3px',
        '5': '4px',
        '6': '5px',
        '7': '6px',
        '8': '7px',
      },
      // ============================================
      // backdrop-filter
      // ============================================
      backdropBlur: {
        'none': '0',
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      // ============================================
      // Z-index 层级系统
      // ============================================
      zIndex: {
        '0': '0',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        'dropdown': '60',
        'sticky': '70',
        'fixed': '80',
        'modal-backdrop': '90',
        'modal': '100',
        'popover': '110',
        'tooltip': '120',
        'toast': '130',
        'max': '999',
      },
    },
  },
  plugins: [],
}