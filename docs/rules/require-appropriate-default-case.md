# Require appropriate `default` case

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

💭 This rule requires [type information](https://typescript-eslint.io/linting/typed-linting).

<!-- end auto-generated rule header -->

> Require a `switch` statement to always have a `default` case, and for that `default` case to enforce compile-time exhaustiveness checking when appropriate.

```json
{
  "rules": {
    "switch-statement/require-appropriate-default-case": "error"
  }
}
```

## Why?

- If the value being `switch`-ed on has a type that's a finite set that could be handled exhaustively, the lint rule will encourage you to: 1) make the `switch` exhaustive and 2) [set up a TS check](https://stackoverflow.com/a/39419171) in the `default` case that verifies that the `switch` remains exhaustive over time, which can catch a lot of bugs.

- If the type of the value being `switch`-ed on is not finite — for example, if you're switching on `error.name`, that's likely an open-ended `string` value, but there may still be some known cases you want to handle specially — the rule will still require you to have a `default` case, to make sure that every possible value is handled, but it won't require you to call your exhaustiveness checking function in the `default` case.

The auto-fix only adds the `default` case when the value being switched on looks finite, as that's the only situation in which it's clear what the `default` case should contain.

Keep in mind that autofixes in eslint use string replacement, so it's difficult to guarantee that the result is syntactically valid JS in every case. Please review the results of the auto-fix manually.

## Options

<!-- begin auto-generated rule options list -->

| Name                                          | Type   | Default             |
| :-------------------------------------------- | :----- | :------------------ |
| `unreachableDefaultCaseAssertionFunctionName` | String | `assertUnreachable` |

<!-- end auto-generated rule options list -->

## When Not To Use It

- If you prefer to use [`@typescript-eslint/switch-exhaustiveness-check`](https://typescript-eslint.io/rules/switch-exhaustiveness-check/) and have another enforcement mechanism for avoiding `default`
- If you prefer to use `default` case for its usual purpose
