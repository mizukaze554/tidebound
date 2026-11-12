import { defineConfig } from 'vite';

export default defineConfig({
  // Relative assets let the production build run from any static folder as well
  // as through the Vite development server.
  base: './',
});
