import type {
  InvalidTestCase,
  ValidTestCase,
} from "@typescript-eslint/rule-tester";
import { makeRuleTester } from "../test-utils/index.js";
import type { MessageIds, Options } from "./require-appropriate-default-case.js";
import {
  RULE_NAME,
  DEFAULT_ASSERT_NEVER_FN_NAME,
} from "./require-appropriate-default-case.js";
import UnreachableDefaultCase from "./require-appropriate-default-case.js";

const ruleTester = makeRuleTester();

const assertNeverOptions = [
  { unreachableDefaultCaseAssertionFunctionName: "assertNever" },
] as const;

const valid: ValidTestCase<Options>[] = [
  { name: "not a switch statement", code: "if (foo) { bar(); }" },
  {
    name: "literal-union switch with default case and default exhaustive function name",
    code: `declare const foo: 2 | 3; switch (foo) { default: { ${DEFAULT_ASSERT_NEVER_FN_NAME}(foo); } }`,
  },
  {
    name: "unit-type-union switch with default case and default exhaustive function name",
    code: `declare const foo: null | undefined; switch (foo) { default: { ${DEFAULT_ASSERT_NEVER_FN_NAME}(foo); } }`,
  },
  {
    name: "literal-union switch with default case and given function name",
    code: "declare const foo: 2 | 3; switch (foo) { default: { assertNever(foo); } }",
    options: assertNeverOptions,
  },
  {
    name: "switch with default case on non-literal union",
    code: "declare const foo: number | string; switch (foo) { case 4: break; default: { throw new Error() } }",
  },
  {
    name: "switch with only a default case on non-literal union",
    code: "declare const foo: number | string; switch (foo) { default: { throw new Error() } }",
  },
  // TODO: while an empty default case is still a default case, maybe we should flag this?
  {
    name: "switch with an empty default case on non-literal union",
    code: "declare const foo: number | string; switch (foo) { case true: break; default: {} }",
  },
  {
    name: "switch with only an empty default case on non-literal union",
    code: "declare const foo: number | string; switch (foo) { default: {} }",
  },
  {
    name: "nested switches, all with default cases",
    code: "declare const foo: number | string; switch (foo) { default: { switch (foo) { default: 4 } } }",
    options: assertNeverOptions,
  }
];

// NB: in the tests below, the inclusion of output in some tests is doing a lot
// of work by implicitly testing whether the code thought that the discriminant
// of the union was eligible to be treated exhaustively (in which case it
// applies the fix of adding a default assertNever case).
const invalid: InvalidTestCase<MessageIds, Options>[] = [
  {
    name: "missing default in switch (on non-union type)",
    code: "switch (foo) { case 2: break }",
    errors: [{ messageId: "addDefaultCase" }],
  },
  {
    name: "missing default in switch (on union literal type)",
    code: "declare const foo: 1 | 2; switch (foo) { case 2: break }",
    output:
      "declare const foo: 1 | 2; switch (foo) { case 2: break \ndefault: assertNever(foo); }",
    options: assertNeverOptions,
    errors: [{ messageId: "addDefaultCase" }],
  },
  {
    name: "missing default in switch (on numeric enum type)",
    code: "enum Direction { Up = 1, Down } declare const foo: Direction; switch (foo) { case 2: break }",
    output:
      "enum Direction { Up = 1, Down } declare const foo: Direction; switch (foo) { case 2: break \ndefault: assertNever(foo); }",
    options: assertNeverOptions,
    errors: [{ messageId: "addDefaultCase" }],
  },
  {
    name: "missing default in switch (on string enum type)",
    code: "enum Direction { Up = 'A', Down = 'B' } declare const foo: Direction; switch (foo) { case 2: break }",
    output:
      "enum Direction { Up = 'A', Down = 'B' } declare const foo: Direction; switch (foo) { case 2: break \ndefault: assertNever(foo); }",
    options: assertNeverOptions,
    errors: [{ messageId: "addDefaultCase" }],
  },
  {
    name: "missing default in switch (on const enum type)",
    code: "const enum Direction { Up = 'A', Down = 'B' } declare const foo: Direction; switch (foo) { case 2: break }",
    output:
      "const enum Direction { Up = 'A', Down = 'B' } declare const foo: Direction; switch (foo) { case 2: break \ndefault: assertNever(foo); }",
    options: assertNeverOptions,
    errors: [{ messageId: "addDefaultCase" }],
  },
  {
    name: "missing default in switch (on branded unit type)",
    code: "declare const foo: 13 & { _brand: 'Hi' }; switch (foo) { case 2: break }",
    output:
      "declare const foo: 13 & { _brand: 'Hi' }; switch (foo) { case 2: break \ndefault: assertNever(foo); }",
    options: assertNeverOptions,
    errors: [{ messageId: "addDefaultCase" }],
  },
  {
    name: "missing default in switch (on intersection reducing to a unit type)",
    code: "declare const foo: (13 | null) & (13 | 14 | null); switch (foo) { case 2: break }",
    output:
      "declare const foo: (13 | null) & (13 | 14 | null); switch (foo) { case 2: break \ndefault: assertNever(foo); }",
    options: assertNeverOptions,
    errors: [{ messageId: "addDefaultCase" }],
  },
  {
    name: "missing default in switch (on template literal types that reduce to a unit type)",
    code: "declare const foo: `${'hello' | 'goodbye'}-world`; switch (foo) { case 2: break }",
    output:
      "declare const foo: `${'hello' | 'goodbye'}-world`; switch (foo) { case 2: break \ndefault: assertNever(foo); }",
    options: assertNeverOptions,
    errors: [{ messageId: "addDefaultCase" }],
  },
  {
    name: "missing default in switch (on conditional type that reduces to a unit type)",
    code: "type Foo<T> = T extends string ? 'hello' : object; declare const foo: Foo<'x'>; switch (foo) { case 2: break }",
    output:
      "type Foo<T> = T extends string ? 'hello' : object; declare const foo: Foo<'x'>; switch (foo) { case 2: break \ndefault: assertNever(foo); }",
    options: assertNeverOptions,
    errors: [{ messageId: "addDefaultCase" }],
  },
  {
    name: "missing default in switch (on conditional type that reduces to a unit type, non-distributive but not yet evaluable)",
    code: `
  type Foo<T> = T extends { x: true } ? 'hello' : 'world';
  function test<T extends object>(foo: Foo<T>) {
    switch (foo) { case 2: break }
  }`,
    output: `
  type Foo<T> = T extends { x: true } ? 'hello' : 'world';
  function test<T extends object>(foo: Foo<T>) {
    switch (foo) { case 2: break \ndefault: assertNever(foo); }
  }`,
    options: assertNeverOptions,
    errors: [{ messageId: "addDefaultCase" }],
  },
  {
    name: "missing default in switch (on conditional type that reduces to a unit type, distributive but not yet evaluable)",
    code: `
type Foo<T> = T extends string ? 'hello' : 'world';
function test<T extends string | number>(foo: Foo<T>) {
  switch (foo) { case 2: break }
}`,
    output: `
type Foo<T> = T extends string ? 'hello' : 'world';
function test<T extends string | number>(foo: Foo<T>) {
  switch (foo) { case 2: break \ndefault: assertNever(foo); }
}`,
    options: assertNeverOptions,
    errors: [{ messageId: "addDefaultCase" }],
  },
  {
    name: "missing default in switch (on other types reducing to a unit type)",
    code: "declare const a: { x: 44 }; declare const foo: keyof typeof a; switch (foo) { case 2: break }",
    output:
      "declare const a: { x: 44 }; declare const foo: keyof typeof a; switch (foo) { case 2: break \ndefault: assertNever(foo); }",
    options: assertNeverOptions,
    errors: [{ messageId: "addDefaultCase" }],
  },
  {
    name: "missing default in switch (on union of unit types)",
    code: "enum Direction { Up = 1, Down } declare const foo: Direction | null; switch (foo) { case 2: break }",
    output:
      "enum Direction { Up = 1, Down } declare const foo: Direction | null; switch (foo) { case 2: break \ndefault: assertNever(foo); }",
    options: assertNeverOptions,
    errors: [{ messageId: "addDefaultCase" }],
  },
  {
    name: "missing default in switch (on intersection constrained to a unit type)",
    code: `
      function x<T extends 'a' | 'b'>(foo: T) {
  switch (foo) { case 'a': break }
      }`,
    // prettier-ignore-next-line
    output: `
      function x<T extends 'a' | 'b'>(foo: T) {
  switch (foo) { case 'a': break \ndefault: assertNever(foo); }
      }`,
    options: assertNeverOptions,
    errors: [{ messageId: "addDefaultCase" }],
  },
  {
    name: "missing default in nested switch (on non-union type)",
    code: "switch (foo) { case 2: { switch (foo) {}; break; }; default: 3 }",
    options: assertNeverOptions,
    errors: [{ messageId: "addDefaultCase" }],
  },
  {
    name: "no exhaustiveness check in default case of switch that could use one - with normal case",
    code: "declare const foo: 1 | 2; switch (foo) { case 1: break; default: { doSomethingElse(foo); } }",
    errors: [{ messageId: "considerExhaustiveSwitch" }],
  },
  {
    name: "no exhaustiveness check in default case of switch that could use one - with only default case",
    code: "declare const foo: null | true; switch (foo) { default: { doSomethingElse(foo); } }",
    errors: [{ messageId: "considerExhaustiveSwitch" }],
  },
  {
    name: "no exhaustiveness check in default case of switch that could use one - on enum with non-literal members",
    code: "enum Direction { X = 1 << 2, Y = 1 << 2 } declare const foo: Direction; switch (foo) { default: true }",
    errors: [{ messageId: "considerExhaustiveSwitch" }],
  },
  {
    name: "no exhaustiveness check in default case of switch that could use one - on enum with computed members",
    code: 'enum Direction { X = "12".length, Y = "32".length } declare const foo: Direction; switch (foo) { default: true }',
    errors: [{ messageId: "considerExhaustiveSwitch" }],
  },
  {
    name: "no exhaustiveness check in default case of switch that could use one - nested switch",
    code: "declare const foo: number | string; declare const x: 1 | 2; switch (foo) { default: { switch (x) { default: 4 } } }",
    errors: [{ messageId: "considerExhaustiveSwitch" }],
  },
  {
    name: "no exhaustiveness check in default case of switch that could use one - outer switch missing check; nested switch has it",
    code: `
        declare const foo: 1 | 2;
        switch (foo) {
          default: {
            switch (true) {
              default: assertUnreachable(foo);
            }
          }
        }`,
    errors: [{ messageId: "considerExhaustiveSwitch" }],
  },
  {
    name: "switch without any cases",
    code: 'declare const foo: "a"; switch (foo) {     }   ',
    errors: [{ messageId: "addDefaultCase" }],
    output:
      'declare const foo: "a"; switch (foo) {     \ndefault: assertUnreachable(foo); }   ',
  },
  {
    name: "switch with unconventionally located case default case",
    code: "declare const foo: 'a'; switch (foo) { default: { doSomethingElse(foo); } case 'bar': doSomething(); break; }",
    errors: [{ messageId: "considerExhaustiveSwitch" }],
  },
  {
    name: "switching on a member expression with an identifier on the LHS",
    code: "declare const foo: { bar: 'a' } | { bar: 'b' }; switch (foo.bar) {}",
    output:
      "declare const foo: { bar: 'a' } | { bar: 'b' }; switch (foo.bar) {\ndefault: assertUnreachable(foo); }",
    errors: [{ messageId: "addDefaultCase" }],
  } as const,
];

ruleTester.run(RULE_NAME, UnreachableDefaultCase, { valid, invalid });
