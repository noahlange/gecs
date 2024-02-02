/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['html'],
      include: ['src'],
      exclude: ['src/test/**/*']
    }
  }
});
