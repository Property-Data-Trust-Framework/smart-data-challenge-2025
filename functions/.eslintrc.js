module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
  },
  extends: ["eslint:recommended", "google"],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    quotes: ["error", "double", { allowTemplateLiterals: true }],
    "require-jsdoc": "off",
    "max-len": "off",
    "quote-props": "off",
    // Match Prettier's defaults
    "object-curly-spacing": ["error", "always"],
    "comma-dangle": ["error", "always-multiline"],
    indent: [
      "error",
      2,
      {
        CallExpression: { arguments: 1 },
        FunctionDeclaration: { body: 1, parameters: 1 },
        FunctionExpression: { body: 1, parameters: 1 },
        MemberExpression: 1,
        ObjectExpression: 1,
        SwitchCase: 1,
        ignoredNodes: ["ConditionalExpression"],
      },
    ],
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
