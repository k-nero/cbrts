import { defineConfig } from '@rsbuild/core';
import { pluginEslint } from '@rsbuild/plugin-eslint';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';

export default defineConfig({
    plugins: [
        pluginReact({
            enableProfiler: true,
            fastRefresh: true,
        }),
        pluginTailwindcss(),
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
    output: {
        distPath: {
            root: 'dist',
        },
    },
});
