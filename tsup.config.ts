import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/bin.ts'
  ],
  dts: true,
  format: [
    'cjs',
    'esm',
  ],
  clean: true,
})
