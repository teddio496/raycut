import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: { fs: { deny: ['**/*.rayconfig', '**/.env*', '**/.local/**', '**/scripts/**', '**/.git/**', '**/*.{crt,pem}'] } } });
