module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    project: ['./tsconfig.json'],
  },
  plugins: ['@typescript-eslint'],
  extends: ['plugin:@typescript-eslint/recommended'],
  rules: {
    // Prevent accidental use of old TanStack Query v3 function signature
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.name='useQuery'][arguments.0.type='ArrayExpression']",
        "message": "useQuery must use the object syntax in TanStack Query v5: useQuery({ queryKey, queryFn, ... })"
      }
    ]
  }
};