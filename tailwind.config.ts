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
        ink: "#080808",
        paper: "#f0f0f0",
        gold: {
          DEFAULT: "#D4AF37",
          light: "#e8c547",
          dark: "#b88a18",
        },
        line: "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.02em",
      },
      animation: {
        "marquee": "marquee 38s linear infinite",
        "scanline": "scanline 2.4s ease-out 0.4s 1",
        "gold-pulse": "goldPulse 2.4s ease-in-out infinite",
        "gold-breath": "goldBreath 4s ease-in-out infinite",
        "bob-slow": "bob 8s ease-in-out infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        scanline: {
          "0%": { transform: "translateY(-10%)", opacity: "0" },
          "10%": { opacity: "0.9" },
          "90%": { opacity: "0.9" },
          "100%": { transform: "translateY(110%)", opacity: "0" },
        },
        goldPulse: {
          "0%,100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.25)" },
        },
        goldBreath: {
          "0%,100%": { boxShadow: "0 0 0 1px rgba(212,175,55,0.35), 0 0 40px rgba(212,175,55,0.18)" },
          "50%": { boxShadow: "0 0 0 1px rgba(212,175,55,0.6), 0 0 80px rgba(212,175,55,0.35)" },
        },
        bob: {
          "0%,100%": { transform: "translate3d(0,0,0)" },
          "50%": { transform: "translate3d(0,-10px,0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
