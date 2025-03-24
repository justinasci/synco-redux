import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import eslint from 'vite-plugin-eslint';

export default defineConfig({
	build: {
		rollupOptions: {
			external: (id) =>
				[
					'@reduxjs/toolkit',
					'webextension-polyfill',
					'immer',
					'electron'
				].includes(id),
			output: {
				globals: {
					'@reduxjs/toolkit': 'RTK'
				}
			}
		},
		lib: {
			entry: './lib/main.ts',
			name: 'SyncoRedux',
			fileName: 'synco-redux'
		}
	},
	test: {
		setupFiles: ['vitest.setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text'],
			include: ['lib/**'],
			exclude: ['lib/__mocks__/**']
		}
	},
	plugins: [
		dts({
			tsconfigPath: './tsconfig.json', // Optional: if you want to specify a tsconfig file
			insertTypesEntry: true, // Add a reference to `types.d.ts` in the entry file
			exclude: ['./lib/__tests__/**']
		}),
		eslint()
	]
});
