import { RuleTester } from "@typescript-eslint/rule-tester";
import { describe, after, it } from "node:test";

RuleTester.afterAll = after;
// eslint-disable-next-line @typescript-eslint/no-misused-promises
RuleTester.describe = describe;
// eslint-disable-next-line @typescript-eslint/no-misused-promises
RuleTester.it = it;

export const makeRuleTester = (): RuleTester =>
  new RuleTester({
    // eslint-disable-next-line node/no-missing-require
    parser: require.resolve("@typescript-eslint/parser"),
    parserOptions: {
      project: "../tsconfig.test.json",
      tsconfigRootDir: __dirname,
    },
    defaultFilenames: {
      ts: "index.js",
      tsx: "index.js",
    },
  });
