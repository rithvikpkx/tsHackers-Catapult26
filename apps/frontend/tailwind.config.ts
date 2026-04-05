import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f7f4ee",
        surface: "#fffdf9",
        ink: "#171717",
        muted: "#6e6a63",
        accent: "#1f4b99",
        risk: "#b9412e",
        safe: "#2c7a4b",
        line: "#ded7cc",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(23, 23, 23, 0.06)",
      },
      borderRadius: {
        card: "28px",
      },
    },
  },
  plugins: [],
};

export default config;
