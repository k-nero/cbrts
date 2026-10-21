import { defineConfig } from '@rsbuild/core';
import { pluginEslint } from '@rsbuild/plugin-eslint';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';

export default defineConfig({
  plugins: [
    pluginReact({
      enableProfiler: true,
      reactCompiler: true,
      splitChunks: true,
      fastRefresh: true,
    }),
    pluginTailwindcss({
      optimize: true,
    }),
    pluginEslint({
      enable: false,
      eslintPluginOptions: {
        // 'off' keeps linting in-process. ESLint 10's multithread path spawns a worker
        // with `env: SHARE_ENV`, which Bun's worker_threads shim rejects.
        concurrency: 'off',
        fix: true,
        allowInlineConfig: true,
      },
    }),
    pluginTypeCheck(),
  ],
  html: {
    template: './index.html',
    tags: [
      {
        tag: 'script',
        attrs: {
          src: 'https://cdn.jsdelivr.net/npm/react-scan/dist/auto.global.js',
        },
        append: false,
      },
    ],
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
  source: {
    entry: {
      index: './src/main.tsx',
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  performance: {
    buildCache: false,
    preload: true,
    prefetch: true,
    printFileSize: true,
    removeConsole: false,
    preconnect: ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
  },
  output: {
    target: 'web',
    distPath: {
      root: 'dist',
    },
  },
});
