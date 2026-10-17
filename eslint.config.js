//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import reactPlugin from 'eslint-plugin-react'
import sonarjsPlugin from 'eslint-plugin-sonarjs'
import unicornPlugin from 'eslint-plugin-unicorn'

export default [
  ...tanstackConfig,
  {
    plugins: {
      react: reactPlugin,
      sonarjs: sonarjsPlugin,
      unicorn: unicornPlugin,
    },
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
      'import/consistent-type-specifier-style': 'off',

      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-duplicated-branches': 'error',
      'react/no-children-prop': 'error',
      'unicorn/prefer-single-call': 'error',

      'object-shorthand': ['error', 'always'],
      'no-useless-rename': 'error',
      'no-useless-computed-key': 'error',

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-inferrable-types': [
        'error',
        { ignoreParameters: false, ignoreProperties: false },
      ],
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-redundant-type-constituents': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        { ignorePrimitives: true },
      ],
      '@typescript-eslint/no-deprecated': 'warn',
    },
  },
  {
    files: ['src/components/ui/**'],
    rules: { '@typescript-eslint/no-unnecessary-condition': 'off' },
  },
  {
    files: ['src/components/ui/calendar.tsx'],
    rules: { '@typescript-eslint/no-shadow': 'off', 'no-shadow': 'off' },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'src/lib/supabase/database.types.ts',
    ],
  },
]
