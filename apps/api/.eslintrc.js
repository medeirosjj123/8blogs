module.exports = {
  root: true,
  extends: ["@tatame/eslint-config/node"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
};