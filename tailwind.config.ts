import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  // ... your other config
  theme: {
    extend: {
      fontFamily: {
        // We keep the Goldman class for the logo
        goldman: ['Goldman', 'cursive'], 
        
        // ⚡ THE MAGIC BULLET: Hijack 'mono' to be Gruppo
        mono: ['Gruppo', 'sans-serif'], 
        
        // (Optional) You can hijack 'sans' too just to be safe!
        sans: ['Gruppo', 'sans-serif'], 
      },
    },
  },
}

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        'theme-primary': {
          DEFAULT: 'rgba(var(--theme-primary), <alpha-value>)',
          100: 'rgba(var(--theme-primary), <alpha-value>)',
          200: 'rgba(var(--theme-primary), <alpha-value>)',
          300: 'rgba(var(--theme-primary), <alpha-value>)',
          400: 'rgba(var(--theme-primary), <alpha-value>)',
          500: 'rgba(var(--theme-primary), <alpha-value>)',
          600: 'rgba(var(--theme-primary), <alpha-value>)',
          700: 'rgba(var(--theme-primary), <alpha-value>)',
          800: 'rgba(var(--theme-primary), <alpha-value>)',
          900: 'rgba(var(--theme-primary), <alpha-value>)',
          950: 'rgba(var(--theme-primary), <alpha-value>)',
        },
        'theme-accent': {
          DEFAULT: 'rgba(var(--theme-accent), <alpha-value>)',
          100: 'rgba(var(--theme-accent), <alpha-value>)',
          200: 'rgba(var(--theme-accent), <alpha-value>)',
          300: 'rgba(var(--theme-accent), <alpha-value>)',
          400: 'rgba(var(--theme-accent), <alpha-value>)',
          500: 'rgba(var(--theme-accent), <alpha-value>)',
          600: 'rgba(var(--theme-accent), <alpha-value>)',
          700: 'rgba(var(--theme-accent), <alpha-value>)',
          800: 'rgba(var(--theme-accent), <alpha-value>)',
          900: 'rgba(var(--theme-accent), <alpha-value>)',
          950: 'rgba(var(--theme-accent), <alpha-value>)',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        lg: 'calc(var(--radius) + 2px)',
        md: 'var(--radius)',
        sm: 'calc(var(--radius) - 2px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-in': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slideDown': {
          from: { transform: 'translateY(-100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slideUp': {
          from: { transform: 'translateY(0)', opacity: '1' },
          to: { transform: 'translateY(-100%)', opacity: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'slideDown': 'slideDown 0.3s ease-out',
        'slideUp': 'slideUp 0.3s ease-out',
      },

      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
          },
        },
      },
    }
  },
  plugins: [
    animate,
    typography,
  ],
} satisfies Config;
