import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    watch: {
      ignored: [
        '**/whatsapp-session/**',
        '**/whatsapp-media/**',
        '**/autoreply-rules.json',
        '**/whatsapp-chats.json',
        '**/whatsapp-messages.json',
        '**/whatsapp-contacts.json',
        '**/scheduled-messages.json',
      ],
    },
  },
})
