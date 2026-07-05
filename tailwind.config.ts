import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: { 
          900: "#050810", 
          800: "#0A0F1C", 
          700: "#111827", 
          600: "#1B2537" 
        },
        ink: { 
          50: "#F5F7FB", 
          200: "#C7CEDC", 
          400: "#8892AB", 
          600: "#5A6480" 
        },
        brand: { 
          400: "#7AD3FF", 
          500: "#3FB6FF", 
          600: "#1F8AE0", 
          700: "#1666AE" 
        },
        accent: { 
          green: "#3EE7A2", 
          amber: "#FFB547", 
          red: "#FF5C7A", 
          violet: "#A78BFA" 
        },
        border: { 
          DEFAULT: "#1F2A40", 
          strong: "#2A3A5C" 
        },
      },
      fontFamily: { 
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"], 
        mono: ["ui-monospace", "SFMono-Regular", "monospace"] 
      },
    },
  },
  plugins: [],
};
export default config;
