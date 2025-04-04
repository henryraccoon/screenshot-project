import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

export default {
  input: "analytics-sdk.ts",
  output: {
    file: "dist/analytics-sdk.min.js",
    format: "iife",
    name: "AnalyticsSDK",
    globals: {
      "lz-string": "LZString",
    },
  },
  plugins: [resolve(), commonjs(), typescript(), terser()],
  external: ["lz-string"],
};
