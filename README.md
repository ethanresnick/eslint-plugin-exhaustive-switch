# eslint-plugin-exhaustive-switch

Rules for making switch/case expressions for union type values exhaustively checkable at compile time.

## Installation

Install `eslint-plugin-exhaustive-switch`. If you want to use the included `assertUnreachable` in your source
code, make sure to save it as a `dependency` and not a `devDependency`.

```sh
npm install eslint-plugin-exhaustive-switch --save-dev
```

## Usage

```ts
import exhaustiveSwitch from "eslint-plugin-exhaustive-switch";

// in your eslint flat config
{
  "plugins":  { "exhaustive-switch": exhaustiveSwitch }
}
```

Then configure the rule under the rules section.

```json
{
  "rules": {
    "exhaustive-switch/require-unreachable-default-case": [
      2,
      { "unreachableDefaultCaseAssertionFunctionName": "assertNever" }
    ]
  }
}
```

## Rules

<!-- begin auto-generated rules list -->

🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).\
💭 Requires [type information](https://typescript-eslint.io/linting/typed-linting).

| Name                                                                               | Description                      | 🔧 | 💭 |
| :--------------------------------------------------------------------------------- | :------------------------------- | :- | :- |
| [require-appropriate-default-case](docs/rules/require-appropriate-default-case.md) | require unreachable default case | 🔧 | 💭 |

<!-- end auto-generated rules list -->
