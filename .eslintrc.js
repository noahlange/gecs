module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  env: { browser: true, es6: true, node: false },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: 'tsconfig.json'
  },
  extends: [
    'eslint:recommended',
    'prettier',
    'plugin:prettier/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:import/errors',
    'plugin:import/typescript'
  ],
  plugins: ['prettier', '@typescript-eslint', 'import', 'simple-import-sort'],
  rules: {
    /** miscellaneous rules */
    'max-classes-per-file': [2, 1],
    /** handled by typescript */
    'no-unused-vars': [0],
    '@typescript-eslint/no-unused-vars': [1],
    '@typescript-eslint/no-implicit-any': [0],
    /** personal preferences */
    '@typescript-eslint/prefer-optional-chain': [2],
    '@typescript-eslint/member-delimiter-style': [2],
    '@typescript-eslint/no-empty-interface': [1],
    '@typescript-eslint/array-type': [1, { default: 'array' }],
    /** where possible, require explicit types. */
    '@typescript-eslint/no-inferrable-types': [0],
    '@typescript-eslint/prefer-enum-initializers': [2],
    '@typescript-eslint/explicit-member-accessibility': [2],
    '@typescript-eslint/explicit-function-return-type': [
      2,
      // ...but not at the expense of readability.
      { allowHigherOrderFunctions: true, allowExpressions: true }
    ],
    // consistency...
    '@typescript-eslint/consistent-type-definitions': [2, 'interface'],
    '@typescript-eslint/consistent-type-imports': [1],
    '@typescript-eslint/consistent-type-assertions': [
      2,
      { assertionStyle: 'as' }
    ],
    'sort-imports': [0],
    'simple-import-sort/imports': [
      1,
      {
        groups: [['^.*\\u0000$'], ['^\\u0000'], ['^@?\\w'], ['^'], ['^\\.']]
      }
    ]
  },
  ignorePatterns: ['*.js']
};
