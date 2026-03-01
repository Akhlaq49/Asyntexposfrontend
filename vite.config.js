import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@components': resolve(__dirname, './src/components'),
            '@pages': resolve(__dirname, './src/pages'),
            '@hooks': resolve(__dirname, './src/hooks'),
            '@utils': resolve(__dirname, './src/utils'),
            '@services': resolve(__dirname, './src/services'),
            '@store': resolve(__dirname, './src/store'),
            '@types': resolve(__dirname, './src/types'),
            '@assets': resolve(__dirname, './src/assets')
        }
    },
    server: {
        port: 3000,
        host: true,
        open: true
    },
    build: {
        outDir: 'dist',
        sourcemap: true
    }
});
