import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#F5F1E8",
          100: "#E8E2D2",
          200: "#C8C0AB",
          300: "#9A9181",
          400: "#6B6457",
          500: "#3D3830",
          600: "#2A2620",
          700: "#1A1815",
          800: "#0F0E0C",
          900: "#08070680",
          DEFAULT: "#0A0908",
        },
        coral: {
          50: "#FFF1EB",
          100: "#FFD9C7",
          200: "#FFB088",
          300: "#FF8758",
          400: "#FF6B35",
          500: "#E85420",
          600: "#B83D14",
          DEFAULT: "#FF6B35",
        },
        sage: {
          400: "#7A8B6F",
          500: "#5A6B4F",
        },
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"Geist"', "system-ui", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.025em",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "fade-up": "fadeUp 0.6s ease-out",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
