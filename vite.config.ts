import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      external: (id) => ["@reduxjs/toolkit", "webextension-polyfill", "immer"].includes(id),
      output: {
        globals: {
          "@reduxjs/toolkit": "RTK",
        }
      }
    },
    lib: {
      entry: './lib/main.ts',
      name: 'SyncoRedux',
      fileName: 'synco-redux',
    },
  },
})
