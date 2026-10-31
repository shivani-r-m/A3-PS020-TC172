import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // reachable from the host machine when run inside the VirtualBox VM
    port: 5173,
  },
});
