import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          DEFAULT: "var(--brand)",
          hover: "var(--brand-hover)",
          soft: "var(--brand-soft)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
        },
        cream: {
          DEFAULT: "var(--cream)",
          dark: "var(--cream-dark)",
        },
        line: "var(--line)",
        surface: "var(--surface)",
        danger: "var(--danger)",
        success: "var(--success)",
      },
      borderRadius: {
        control: "0.5rem",
        panel: "1rem",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(12, 31, 51, 0.04), 0 8px 24px -12px rgba(12, 31, 51, 0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
