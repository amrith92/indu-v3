
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['server/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  external: ['vite'],
  noExternal: ['sharp']
});
