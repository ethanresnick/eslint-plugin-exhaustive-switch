/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:eslint-plugin/recommended",
    "plugin:node/recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/strict",
    "prettier", // disables rules that would conflict with prettier
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
  plugins: ["@typescript-eslint"],
  root: true,
  ignorePatterns: ["node_modules/", "dist/", ".eslintrc.js"],
  rules: {
    "@typescript-eslint/explicit-module-boundary-types": 2,
    "@typescript-eslint/consistent-type-imports": 2,
    "@typescript-eslint/consistent-type-definitions": [2, "type"],
    "@typescript-eslint/no-unused-vars": [
      2,
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
  },
  overrides: [
    {
      files: "*.ts",
      rules: {
        "node/no-missing-import": 0,
      },
    },
    {
      files: ["*.ts", ".eslintrc.js"],
      rules: {
        "@typescript-eslint/no-var-requires": 0,
        "node/no-unsupported-features/es-syntax": 0,
      },
      env: {
        node: true,
      },
    },
    {
      files: [
        ".eslintrc.js",
        "jest.config.ts",
        "scripts/*",
        "*.test.ts",
        "lib/test-utils/*",
      ],
      rules: {
        "node/no-unpublished-import": 0,
        "node/no-unpublished-require": 0,
      },
    },
  ],
};
