import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";

export const DEFAULT_ASSERT_NEVER_FN_NAME = "assertUnreachable";

export const RULE_NAME = "require-appropriate-default-case";

export type MessageIds = keyof typeof messages;
export type Options = [{ unreachableDefaultCaseAssertionFunctionName: string }];

const messages = {
  addDefaultCase:
    "Every switch statement must have a `default` case, which should either " +
    "have Typescript verify that the switch is exhaustive (by including a " +
    "function call that will trigger a type error unless the variable's type " +
    "has been narrowed to never) or should have generic fallback logic.",
  considerExhaustiveSwitch:
    "This switch statement is switching over a set of known values, so it " +
    "could handle them exhaustively, with a `default` case that calls " +
    "`{{ exhaustiveFunctionName }}`, to have TS verify the exhaustiveness. " +
    "Consider updating your `default` case to have that exhaustiveness check, " +
    "or disable the lint rule on this `switch` if you're sure you want to " +
    "apply general fallback logic (e.g., to all future cases).",
};

export default ESLintUtils.RuleCreator.withoutDocs<Options, MessageIds>({
  defaultOptions: [
    {
      unreachableDefaultCaseAssertionFunctionName: DEFAULT_ASSERT_NEVER_FN_NAME,
    },
  ],
  meta: {
    type: "problem",
    fixable: "code",
    docs: {
      description: "require unreachable default case",
      url: "https://github.com/ethanresnick/eslint-plugin-exhaustive-switch/blob/main/docs/rules/require-unreachable-default-case.md",
    },
    schema: [
      {
        type: "object",
        properties: {
          unreachableDefaultCaseAssertionFunctionName: {
            type: "string",
            default: DEFAULT_ASSERT_NEVER_FN_NAME,
          },
        },
      },
    ],
    messages,
  },
  create(context, options) {
    const sourceCode = context.sourceCode;
    const services = ESLintUtils.getParserServices(context);

    if (!services || !services.getTypeAtLocation) {
      throw new Error("This rule requires type checking to be available");
    }

    const checker = services.program.getTypeChecker();
    const { getTypeAtLocation } = services;

    const exhaustiveFunctionName =
      options[0].unreachableDefaultCaseAssertionFunctionName;

    function isCandidateForExhaustiveSwitch(type: ts.Type): boolean {
      if ((type.flags & ts.TypeFlags.Unit) > 0) return true;

      if (type.isUnion()) {
        return type.types.every((t) => isCandidateForExhaustiveSwitch(t));
      }

      if (type.isIntersection()) {
        return type.types.some((t) => isCandidateForExhaustiveSwitch(t));
      }

      // For everything else, try to check their constraint. This handles type
      // parameters, but also things like conditional types and, probably, index
      // access types.
      const constraint = checker.getBaseConstraintOfType(type);
      return constraint ? isCandidateForExhaustiveSwitch(constraint) : false;
    }

    // Keep a stack of switch statements as we traverse down into them.
    const switchStatements: {
      node: TSESTree.SwitchStatement;
      hasDefaultCase: boolean;
      switchesOnLiteralTypeUnion: boolean;
      // False if there is no default case.
      defaultCaseCallsExhaustiveFunction: boolean;
    }[] = [];

    return {
      SwitchStatement(node: TSESTree.SwitchStatement) {
        switchStatements.push({
          node,
          switchesOnLiteralTypeUnion: isCandidateForExhaustiveSwitch(
            getTypeAtLocation(node.discriminant)
          ),
          // if we find one, we'll change this below.
          hasDefaultCase: false,
          defaultCaseCallsExhaustiveFunction: false,
        });
      },
      "SwitchCase[test=null]"(_node: TSESTree.SwitchCase) {
        // If we're in a switch case, we know we're in a switch statement.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        switchStatements.at(-1)!.hasDefaultCase = true;
      },
      [`SwitchCase[test=null] CallExpression[callee.name=${exhaustiveFunctionName}]`](
        _node: TSESTree.CallExpression
      ) {
        // If we're in a switch case, we know we're in a switch statement.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        switchStatements.at(-1)!.defaultCaseCallsExhaustiveFunction = true;
      },
      "SwitchStatement:exit"(node: TSESTree.SwitchStatement) {
        const switchStatement = switchStatements.pop();
        if (switchStatement?.node !== node) {
          throw new Error("Unexpected switch statement exit");
        }

        const {
          switchesOnLiteralTypeUnion,
          hasDefaultCase,
          defaultCaseCallsExhaustiveFunction,
        } = switchStatement;

        // If the node doesn't switch on a union of literal types, and does have
        // a default case, it must be ok, because we don't require a call to the
        // exhaustiveness check function when the switch isn't on a literal union.
        if (hasDefaultCase && !switchesOnLiteralTypeUnion) {
          return;
        }

        // If the switch is on a union of literal types, we must check for an
        // assert unreachable call in its default.
        if (hasDefaultCase && switchesOnLiteralTypeUnion) {
          if (defaultCaseCallsExhaustiveFunction) {
            return;
          } else {
            context.report({
              node,
              data: { exhaustiveFunctionName },
              messageId: "considerExhaustiveSwitch",
            });
            return;
          }
        }

        // If the switch doesn't have a default case, and it switches on a union
        // of literal types, we report an "add default case error", but this one
        // is fixable (because we can synthesize a default case that calls the
        // exhaustiveness check function).
        if (!hasDefaultCase && switchesOnLiteralTypeUnion) {
          context.report({
            node,
            messageId: "addDefaultCase",
            fix(fixer) {
              const argumentNode = getExhaustivenessCheckFunctionArg(node);

              if (!argumentNode) {
                return null;
              }

              const switchStatementSourceCode = sourceCode.getText(node);
              const argSourceCode = sourceCode.getText(argumentNode);

              // We assume the source code for the switch statement always ends
              // with a `}`, and that the default case should come last, so we
              // trim off the trailing `}` and add the default case. This logic
              // feels more brittle than `insertTextAfter(nodeForLastCase)`, but
              // that logic wouldn't work for empty switch statements, so we'd
              // need something like this anyway.
              //
              // NB: We add a new line above the default to reduce the cases
              // where this would produce invalid Javascript (e.g., if the prior
              // case statement doesn't end with a `;` and isn't in a a block),
              // but the nature of string-based fixers is that there will
              // probably always be some.
              return fixer.replaceTextRange(
                node.range,
                switchStatementSourceCode.slice(0, -1) +
                  "\ndefault: " +
                  `${exhaustiveFunctionName}(${argSourceCode}); }`
              );
            },
          });
        }

        // Finally, if the switch doesn't have a default case and doesn't switch
        // on a union of literal types, we report an "add default case" error,
        // but this one is unfixable, because it's unclear what the default case
        // should do.
        if (!hasDefaultCase && !switchesOnLiteralTypeUnion) {
          context.report({
            node,
            messageId: "addDefaultCase",
          });
        }
      },
    };
  },
});

function assertUnreachable(it: never): never {
  throw new Error(`Unreachable case: ${JSON.stringify(it)}`);
}

function getExhaustivenessCheckFunctionArg(
  node: TSESTree.SwitchStatement
): TSESTree.Identifier | undefined {
  switch (node.discriminant.type) {
    case TSESTree.AST_NODE_TYPES.ArrayPattern:
    case TSESTree.AST_NODE_TYPES.ArrowFunctionExpression:
    case TSESTree.AST_NODE_TYPES.AssignmentExpression:
    case TSESTree.AST_NODE_TYPES.AwaitExpression:
    case TSESTree.AST_NODE_TYPES.BinaryExpression:
    case TSESTree.AST_NODE_TYPES.CallExpression:
    case TSESTree.AST_NODE_TYPES.ChainExpression:
    case TSESTree.AST_NODE_TYPES.ClassExpression:
    case TSESTree.AST_NODE_TYPES.ConditionalExpression:
    case TSESTree.AST_NODE_TYPES.FunctionExpression:
    case TSESTree.AST_NODE_TYPES.ImportExpression:
    case TSESTree.AST_NODE_TYPES.JSXElement:
    case TSESTree.AST_NODE_TYPES.JSXFragment:
    case TSESTree.AST_NODE_TYPES.Literal:
    case TSESTree.AST_NODE_TYPES.TemplateLiteral:
    case TSESTree.AST_NODE_TYPES.LogicalExpression:
    case TSESTree.AST_NODE_TYPES.MetaProperty:
    case TSESTree.AST_NODE_TYPES.NewExpression:
    case TSESTree.AST_NODE_TYPES.ObjectExpression:
    case TSESTree.AST_NODE_TYPES.ObjectPattern:
    case TSESTree.AST_NODE_TYPES.SequenceExpression:
    case TSESTree.AST_NODE_TYPES.TSAsExpression:
    case TSESTree.AST_NODE_TYPES.TSSatisfiesExpression:
    case TSESTree.AST_NODE_TYPES.Super:
    case TSESTree.AST_NODE_TYPES.TaggedTemplateExpression:
    case TSESTree.AST_NODE_TYPES.ThisExpression:
    case TSESTree.AST_NODE_TYPES.TSInstantiationExpression:
    case TSESTree.AST_NODE_TYPES.TSNonNullExpression:
    case TSESTree.AST_NODE_TYPES.TSTypeAssertion:
    case TSESTree.AST_NODE_TYPES.UnaryExpression:
    case TSESTree.AST_NODE_TYPES.UpdateExpression:
    case TSESTree.AST_NODE_TYPES.YieldExpression:
    case TSESTree.AST_NODE_TYPES.ArrayExpression: {
      return undefined;
    }
    case TSESTree.AST_NODE_TYPES.Identifier:
      return node.discriminant;

    // If we're switching on a member expression, it's _usually_ a discriminant,
    // in which case the object will be narrowed to never, so we want to return
    // the object (not the member expression itself) as the argument to the call
    // to the exhaustiveness check function, but only if it's an identifier; if
    // it was something dynamic -- like `switch(callSomeFunction().foo)` -- then
    // we don't want to evaluate the expression again in the default case.
    // Granted, the default case should be unreachable, but it's still unsafe if
    // the types are inaccurate, and it's unlikely to be useful because TS
    // doesn't know that callSomeFunction() returns a constant value.
    case TSESTree.AST_NODE_TYPES.MemberExpression: {
      const object = node.discriminant.object;
      if (object.type === TSESTree.AST_NODE_TYPES.Identifier) {
        return object;
      }
      return undefined;
    }
    default: {
      assertUnreachable(node.discriminant);
    }
  }
}
