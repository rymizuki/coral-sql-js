// @ts-check
import globals from 'globals'
import ts from 'typescript-eslint'

import js from '@eslint/js'

export default ts.config(
  js.configs.recommended,
  ts.configs.recommended,
  {
    files: ['**/*.{cjs,mjs}'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  {
    rules: {
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn'
    }
  },
  {
    ignores: ['dist/**/*']
  }
)
