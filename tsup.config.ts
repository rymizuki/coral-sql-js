import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./src/index.ts'],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  format: ['esm', 'cjs'],
  tsconfig: './tsconfig.build.json'
})
