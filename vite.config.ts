import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:5000';
  const apiPrefix = env.VITE_API_PREFIX;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: "@use '@/styles/variables' as *;",
        },
      },
    },
    server: {
      proxy: {
        [apiPrefix]: {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
