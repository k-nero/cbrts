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
  dev: {
    lazyCompilation: {
      imports: true,
      entries: false,
      // The Overview's two charts are imported lazily at the same moment and share @ant-design/plots; compiled on
      // demand, one of them never resolved and its panel stayed on the skeleton until a reload. Compile them up front.
      test: (module) => !/[\\/]src[\\/]components[\\/]report[\\/]/.test(module.identifier()),
    },
  },
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
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
  tools: {
    rspack: {
      module: {
        rules: [
          {
            // react-scan 0.5.7's ES build takes `version` from react-grab's package.json as a named
            // import, which strict .mjs parsing refuses. Parse its files loosely so dev can load it.
            test: /[\\/]node_modules[\\/]react-scan[\\/]dist[\\/].*\.mjs$/,
            type: 'javascript/auto',
          },
        ],
      },
    },
  },
  output: {
    target: 'web',
    distPath: {
      root: 'dist',
    },
  },
});
