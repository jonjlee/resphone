import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: '/',
    root: '.',
    server: {
        port: 3000,
        open: true
    },
    build: {
        outDir: 'docs',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'main.html'),
                index: resolve(__dirname, 'index.html')
            }
        }
    }
}); 