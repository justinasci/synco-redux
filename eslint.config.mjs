// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	eslint.configs.recommended,
	tseslint.configs.recommended,
	{
		files: ['**/*.test.*'],
		rules: {
			'no-unused-expressions': 'off', // Useful for assertion libraries
			'no-console': 'off', // Allow console logs in tests
			'@typescript-eslint/no-explicit-any': 'off' // Allow `any` in test files
		}
	}
);
