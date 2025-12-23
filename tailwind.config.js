/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // iA Writer inspired color palette
                'editor-bg': '#fafafa',
                'editor-bg-dark': '#1a1a1a',
                'editor-text': '#1a1a1a',
                'editor-text-dark': '#e8e8e8',
                'accent': '#0066cc',
                'sidebar-bg': '#f5f5f5',
                'sidebar-bg-dark': '#252525',
            },
            fontFamily: {
                'mono': ['iA Writer Mono', 'JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
                'sans': ['iA Writer Quattro', 'Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
    darkMode: 'class',
}
