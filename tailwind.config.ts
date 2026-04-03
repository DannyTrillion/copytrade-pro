import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // TradingView-inspired dark theme system
        brand: {
          DEFAULT: "#2962FF",
          light: "#5B8DEF",
          dark: "#1E4FCC",
          50: "#EBF0FF",
          100: "#D6E1FF",
          200: "#ADC3FF",
          300: "#85A5FF",
          400: "#5C87FF",
          500: "#2962FF",
          600: "#1E4FCC",
          700: "#143B99",
          800: "#0A2866",
          900: "#051433",
        },
        surface: {
          0: "rgb(var(--surface-0) / <alpha-value>)",
          1: "rgb(var(--surface-1) / <alpha-value>)",
          2: "rgb(var(--surface-2) / <alpha-value>)",
          3: "rgb(var(--surface-3) / <alpha-value>)",
          4: "rgb(var(--surface-4) / <alpha-value>)",
          5: "rgb(var(--surface-5) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--border-default) / <alpha-value>)",
          light: "rgb(var(--border-light) / <alpha-value>)",
          focus: "#2962FF",
        },
        text: {
          primary: "rgb(var(--text-primary) / <alpha-value>)",
          secondary: "rgb(var(--text-secondary) / <alpha-value>)",
          tertiary: "rgb(var(--text-tertiary) / <alpha-value>)",
          quaternary: "rgb(var(--text-tertiary) / 0.5)",
          inverse: "rgb(var(--text-inverse) / <alpha-value>)",
        },
        success: {
          DEFAULT: "#26A69A",
          light: "#4DB6AC",
          dark: "#00897B",
        },
        danger: {
          DEFAULT: "#EF5350",
          light: "#EF6C6E",
          dark: "#D32F2F",
        },
        warning: {
          DEFAULT: "#FF9800",
          light: "#FFB74D",
        },
        info: {
          DEFAULT: "#2962FF",
          light: "#5B8DEF",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Trebuchet MS",
          "Roboto",
          "Ubuntu",
          "sans-serif",
        ],
        mono: ["SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        glow: "0 0 20px rgba(41, 98, 255, 0.15)",
        "glow-lg": "0 0 40px rgba(41, 98, 255, 0.2), 0 0 80px rgba(41, 98, 255, 0.08)",
        "glow-success": "0 0 20px rgba(38, 166, 154, 0.15)",
        "glow-danger": "0 0 20px rgba(239, 83, 80, 0.15)",
        card: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
        "elevated-lg": "0 8px 32px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3)",
        "inner-glow": "inset 0 1px 0 0 rgba(255, 255, 255, 0.03)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "slide-right": "slideRight 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
        "float": "float 3s ease-in-out infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "count-up": "countUp 0.6s ease-out",
        "border-flow": "borderFlow 3s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideRight: {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(41, 98, 255, 0.1)" },
          "50%": { boxShadow: "0 0 30px rgba(41, 98, 255, 0.25)" },
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        borderFlow: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
      backgroundImage: {
        shimmer:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
        "gradient-radial": "radial-gradient(ellipse at center, var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "mesh-gradient":
          "radial-gradient(at 40% 20%, rgba(41, 98, 255, 0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(38, 166, 154, 0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(41, 98, 255, 0.04) 0px, transparent 50%)",
      },
      screens: {
        xs: "475px",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
