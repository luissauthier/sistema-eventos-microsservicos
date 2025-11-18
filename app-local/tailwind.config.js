// tailwind.config.js

const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  darkMode: ["class"], // Você controla adicionando .dark no body
  content: [
    "./renderer/**/*.{js,jsx,ts,tsx}",
    "./preload.js",
    "./main/**/*.{js}",
    "./index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
      },

      colors: {
        // Integração com o theme.css via CSS variables
        bg: "var(--bg)",
        "bg-soft": "var(--bg-soft)",
        "bg-card": "var(--bg-card)",

        border: "var(--border)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",

        primary: "var(--primary)",
        "primary-hover": "var(--primary-hover)",
        "primary-soft": "var(--primary-soft)",

        success: "var(--success)",
        "success-soft": "var(--success-soft)",

        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",

        warning: "var(--warning)",
        "warning-soft": "var(--warning-soft)",
      },

      borderRadius: {
        base: "var(--radius)",
      },

      boxShadow: {
        soft: "0px 4px 12px var(--shadow)",
      }
    },
  },
    plugins: [require("tailwindcss-animate")],
};