import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.strict,
  stylistic.configs.customize({
    semi: true,
    commaDangle: 'never',
    braceStyle: '1tbs',
    blockSpacing: true,
    indent: 2,
    quoteProps: 'as-needed',
    quotes: 'single',
    rules: {
      'arrow-parens': ['error', 'as-needed', { requireForBlockBody: true }]
    }
  }),
  {
    ignores: ['dist', 'out', 'build']
  },
  {
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'prefer-rest-params': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
      '@typescript-eslint/no-invalid-void-type': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/unified-signatures': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true
        }
      ]
    }
  }
];
