import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Match Express's PORT setting so frontend requests reach this project's API.
  const apiPort = process.env.PORT || env.PORT || '3002';
  return {
    plugins: [react()],
    server: { proxy: { '/api': `http://127.0.0.1:${apiPort}` } },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            charts: ['echarts'],
            graph: ['cytoscape'],
            tables: ['@tanstack/react-table'],
            react: ['react', 'react-dom'],
          },
        },
      },
    },
  };
});
