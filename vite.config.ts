/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Cross-origin isolation lets the in-browser voice model use several CPU threads (much faster speech).
const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  plugins: [react()],
  server: { headers: isolation },
  preview: { headers: isolation },
  // The voice worker uses ES module features (import.meta), so bundle it as a module worker.
  worker: { format: 'es' },
  build: {
    rolldownOptions: {
      output: {
        // Shared groups are named after every lesson group that uses them; keep their file names short.
        chunkFileNames: (chunk) => (chunk.name.startsWith('lesson-kit') ? 'assets/kit-[hash].js' : 'assets/[name]-[hash].js'),
        codeSplitting: {
          groups: [
            // Icons and drawing helpers that several lessons and games share. Left alone, each becomes its
            // own tiny file (dozens of downloads per lesson group); this makes a few, grouped by who uses them.
            {
              name: 'lesson-kit',
              test: /node_modules[\\/]lucide-react|src[\\/](stage|visuals|lib)[\\/]|src[\\/]lessons[\\/]types/,
              minShareCount: 2,
              entriesAware: true,
              entriesAwareMergeThreshold: 12000,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'node',
    // The full interaction sweep is CPU-heavy; keep it from saturating the developer's machine.
    maxWorkers: 1,
  },
});
