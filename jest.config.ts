import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom",
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "./tsconfig.json",
      },
    ],
    "^.+\\.jsx?$": [
      "babel-jest",
      {
        presets: [[
          "@babel/preset-env",
          {
            targets: { node: "current" },
            modules: "commonjs",
          },
        ]],
      },
    ],
  },
  moduleFileExtensions: ["ts", "js", "json", "node"],
  moduleNameMapper: {
    "^@cljs/(.*)$": "<rootDir>/build/cljs/$1",
  },
  testMatch: ["**/?(*.)+(spec|test).[tj]s"],
  collectCoverageFrom: ["src/**/*.{ts,js}", "!src/**/*.d.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};

export default config;
