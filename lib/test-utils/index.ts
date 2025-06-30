import { RuleTester } from "@typescript-eslint/rule-tester";
import parser from "@typescript-eslint/parser";
import { describe, after, it } from "node:test";

RuleTester.afterAll = after;
RuleTester.describe = describe;
RuleTester.it = it;

export const makeRuleTester = (): RuleTester =>
  new RuleTester({
    languageOptions: {
      parser,
      parserOptions: {
        project: "../tsconfig.test.json",
        tsconfigRootDir: __dirname,
      },
    },
    defaultFilenames: {
      ts: "index.js",
      tsx: "index.js",
    },
  });
