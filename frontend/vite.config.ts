import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, '../'), '');
  const BACKEND_PORT = env.BACKEND_PORT || process.env.BACKEND_PORT || '8789';
  const FRONTEND_PORT = parseInt(env.VITE_PORT || process.env.VITE_PORT || '5175', 10);
  const googleClientId =
    env.VITE_GOOGLE_CLIENT_ID ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    '272183133963-1scshesrdvt7s6ke9g0rco15rapack7t.apps.googleusercontent.com';
  const apiBaseUrl =
    env.VITE_API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    (mode === 'production' ? 'https://student-os-backend-production.sidd-gbu.workers.dev' : '');

  return {
    plugins: [react()],
    envDir: resolve(__dirname, '../'),
    define: {
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(googleClientId),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl),
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    server: {
      port: FRONTEND_PORT,
      proxy: {
        '/api': {
          target: `http://localhost:${BACKEND_PORT}`,
          changeOrigin: true,
        },
      },
    },
  };
});
