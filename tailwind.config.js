/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: 'var(--primary)',
                'primary-hover': 'var(--primary-hover)',
                secondary: 'var(--secondary)',
                background: 'var(--background)',
                surface: 'var(--surface)',
                'surface-hover': 'var(--surface-hover)',
                text: 'var(--text)',
                'text-muted': 'var(--text-muted)',
                border: 'var(--border)',
                glass: 'var(--glass)',
                'glass-border': 'var(--glass-border)',
            },
            borderRadius: {
                DEFAULT: 'var(--radius)',
            },
            fontFamily: {
                sans: ['var(--font-sans)', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
