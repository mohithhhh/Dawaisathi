import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Color palette: #12242e (dark navy bg), #fbe2a7 (warm gold accent), #f3e3ea (blush secondary)
        background: "#0d1c24",
        surface: "#12242e",
        "surface-2": "#1a3040",
        accent: "#fbe2a7",
        "accent-dim": "#c9a96e",
        "accent-glow": "rgba(251, 226, 167, 0.15)",
        blush: "#f3e3ea",
        "blush-dim": "#d4b8c4",
        "blush-glow": "rgba(243, 227, 234, 0.12)",
        muted: "#6b8a9a",
        "text-primary": "#f0f8ff",
        "text-secondary": "#a8bec9",
        border: "#1e3a4a",
        danger: "#f87171",
      },
      fontFamily: {
        sans: ["Noto Sans", "system-ui", "sans-serif"],
        devanagari: ["Noto Sans Devanagari", "Noto Sans", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      backgroundImage: {
        "shimmer-gradient":
          "linear-gradient(90deg, transparent 0%, rgba(251,226,167,0.1) 50%, transparent 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
