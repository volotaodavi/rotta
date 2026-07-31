module.exports = {
  root: true,
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  extends: ["@rotta/config/eslint/nestjs"],
  ignorePatterns: [".eslintrc.cjs", "dist", "node_modules"],
};
