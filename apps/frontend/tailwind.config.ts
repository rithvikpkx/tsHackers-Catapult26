import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f5f4f0",
        ink: "#111111",
        muted: "#6b7280",
        accent: "#f97316",
        risk: "#dc2626",
        safe: "#16a34a"
      }
    }
  },
  plugins: []
};

export default config;

