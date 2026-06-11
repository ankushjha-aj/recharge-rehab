/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Tokens that actually render are driven by CSS variables (see index.css)
        // so they swap between the light and dark themes. `<alpha-value>` keeps
        // opacity modifiers like `bg-surface/90` working.
        "on-primary-container": "rgb(var(--color-on-primary-container) / <alpha-value>)",
        "primary-fixed": "rgb(var(--color-primary-fixed) / <alpha-value>)",
        "surface-container-low": "rgb(var(--color-surface-container-low) / <alpha-value>)",
        "on-tertiary-fixed": "rgb(var(--color-on-tertiary-fixed) / <alpha-value>)",
        "outline-variant": "rgb(var(--color-outline-variant) / <alpha-value>)",
        "on-primary-fixed-variant": "rgb(var(--color-on-primary-fixed-variant) / <alpha-value>)",
        "on-surface-variant": "rgb(var(--color-on-surface-variant) / <alpha-value>)",
        "primary": "rgb(var(--color-primary) / <alpha-value>)",
        "on-surface": "rgb(var(--color-on-surface) / <alpha-value>)",
        "surface-variant": "rgb(var(--color-surface-variant) / <alpha-value>)",
        "surface-container-high": "rgb(var(--color-surface-container-high) / <alpha-value>)",
        "surface": "rgb(var(--color-surface) / <alpha-value>)",
        "tertiary-fixed": "rgb(var(--color-tertiary-fixed) / <alpha-value>)",
        "primary-container": "rgb(var(--color-primary-container) / <alpha-value>)",
        "surface-container-lowest": "rgb(var(--color-surface-container-lowest) / <alpha-value>)",
        "background": "rgb(var(--color-background) / <alpha-value>)",
        "on-primary": "rgb(var(--color-on-primary) / <alpha-value>)",

        // Remaining tokens are not currently rendered; kept as static values.
        "on-error": "#ffffff",
        "inverse-surface": "#303030",
        "error-container": "#ffdad6",
        "tertiary-container": "#77a842",
        "on-secondary-container": "#6f4600",
        "on-tertiary": "#ffffff",
        "inverse-primary": "#a4c9ff",
        "on-secondary-fixed-variant": "#643f00",
        "error": "#ba1a1a",
        "on-tertiary-container": "#1e3900",
        "secondary-container": "#feb246",
        "on-secondary-fixed": "#2a1800",
        "on-primary-fixed": "#001c39",
        "surface-container": "#efeded",
        "inverse-on-surface": "#f2f0f0",
        "tertiary": "#3e6a03",
        "surface-container-highest": "#e4e2e2",
        "on-background": "#1b1c1c",
        "on-tertiary-fixed-variant": "#2d5000",
        "tertiary-fixed-dim": "#a2d66a",
        "outline": "#727782",
        "secondary-fixed": "#ffddb6",
        "on-error-container": "#93000a",
        "secondary": "#845400",
        "on-secondary": "#ffffff",
        "surface-bright": "#fbf9f8",
        "surface-dim": "#dbd9d9",
        "primary-fixed-dim": "#a4c9ff",
        "secondary-fixed-dim": "#ffb95a",
        "surface-tint": "#075fab",
      },
      borderRadius: {
        DEFAULT: "1rem",
        lg: "2rem",
        xl: "3rem",
        full: "9999px",
      },
      spacing: {
        gutter: "24px",
        base: "8px",
        "max-width": "1280px",
        "margin-mobile": "16px",
        "margin-desktop": "64px",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
      fontSize: {
        "label-md": [
          "12px",
          {
            lineHeight: "14px",
            letterSpacing: "0.05em",
            fontWeight: "600",
          },
        ],
        "headline-md": [
          "20px",
          {
            lineHeight: "28px",
            fontWeight: "600",
          },
        ],
        "body-md": [
          "14px",
          {
            lineHeight: "20px",
            fontWeight: "400",
          },
        ],
        "headline-xl": [
          "36px",
          {
            lineHeight: "44px",
            letterSpacing: "-0.02em",
            fontWeight: "700",
          },
        ],
        "headline-lg": [
          "28px",
          {
            lineHeight: "36px",
            letterSpacing: "-0.01em",
            fontWeight: "600",
          },
        ],
        "body-sm": [
          "12px",
          {
            lineHeight: "16px",
            fontWeight: "400",
          },
        ],
        "headline-lg-mobile": [
          "24px",
          {
            lineHeight: "32px",
            fontWeight: "600",
          },
        ],
        "headline-sm": [
          "18px",
          {
            lineHeight: "24px",
            fontWeight: "600",
          },
        ],
        "body-lg": [
          "16px",
          {
            lineHeight: "24px",
            fontWeight: "400",
          },
        ],
      },
    },
  },
  plugins: [],
};
