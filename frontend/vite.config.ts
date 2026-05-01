import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': process.env.VITE_PROXY_API_URL || 'http://localhost:5000',
      '/health': process.env.VITE_PROXY_API_URL || 'http://localhost:5000',
    },
  },
});
