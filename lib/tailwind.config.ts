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
        // สีพื้นหลังหลักของแอป
        bgDark: "#0B0E14", 
        // สีพื้นหลังของ Sidebar และการ์ดต่างๆ
        cardDark: "#151923",
        cardLight: "#1E2330",
        // สี Accent แบบนีออนตามในรูป
        brandPurple: "#8B5CF6",
        brandGreen: "#10B981",
        brandBlue: "#3B82F6",
        brandOrange: "#F59E0B",
        brandRed: "#EF4444",
        textMuted: "#9CA3AF"
      },
    },
  },
  plugins: [],
};
export default config;