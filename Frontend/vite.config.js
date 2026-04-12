import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})

// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import tailwindcss from '@tailwindcss/vite';
// import path from 'path';

// export default defineConfig({
// 	plugins: [react(), tailwindcss()],
// 	resolve: {
// 		alias: { '@': path.resolve(__dirname, 'src') },
// 	},
// 	server: {
// 		port: 3000,
// 		proxy: {
// 			'/api': {
// 				target: 'http://localhost:5000',
// 				changeOrigin: true,
// 			}
// 		}
// 	}
// });