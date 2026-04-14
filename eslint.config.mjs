import antfu from "@antfu/eslint-config";

export default antfu(
  {
    type: "lib",
    lessOpinionated: true,
    typescript: {
      tsconfigPath: "tsconfig.json",
    },
    stylistic: {
      indent: 2,
      quotes: "double",
      semi: true,
    },
    jsonc: true,
    yaml: false,
    markdown: false,
    ignores: [
      "**/node_modules/**",
      "**/coverage/**",
      "**/dist/**",
      "**/.tmp/**",
      "**/.tmp-report-compare/**",
      "**/.venv-pyref/**",
      "assets/**",
      "bun.lock",
      "cache/**",
      "src/generated/chart-assets.ts",
      "src/generated/sweph/constants.ts",
      "src/generated/sweph/emscripten/**",
      "vendor/**",
    ],
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      "test/consistent-test-it": "off",
    },
  },
  {
    files: ["**/*.ts"],
    rules: {
      "no-console": ["error", { allow: ["error", "info", "log", "warn"] }],
      "node/prefer-global/process": "off",
      "ts/explicit-function-return-type": "off",
      "ts/no-explicit-any": "off",
      "ts/no-namespace": "off",
      "ts/no-unsafe-argument": "off",
      "ts/no-unsafe-assignment": "off",
      "ts/no-unsafe-declaration-merging": "off",
      "ts/no-unsafe-member-access": "off",
      "ts/restrict-template-expressions": "off",
      "ts/strict-boolean-expressions": "off",
      "ts/unbound-method": "off",
    },
  },
);
