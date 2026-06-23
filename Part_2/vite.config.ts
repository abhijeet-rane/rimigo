import path from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    base: process.env.VITE_STATIC_FILE_BASE_DOMAIN,
    optimizeDeps: {
        include: [
            '@radix-ui/react-accordion',
            '@radix-ui/react-avatar',
            '@radix-ui/react-dialog',
            '@radix-ui/react-tooltip',
            'lucide-react',
            'sonner',
            // Pre-bundle the PDF export deps so the first click on
            // "Download PDF" doesn't trigger Vite's runtime re-optimisation
            // (which force-reloads the page mid-click). These only load
            // when the user actually exports, but Vite needs to know
            // about them at startup.
            '@react-pdf/renderer',
            'file-saver',
        ]
    },
    build: {
        chunkSizeWarningLimit: 1000
    }
})
