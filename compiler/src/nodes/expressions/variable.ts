import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import { ConstantDefinition, VariableDefinition } from "../../visit/definitions";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";
import type { Codegen } from "../../codegen";
import type { Node } from "../../node";
import type { TypeParameterNode } from "../types/parameter";
import type { Type } from "../../typecheck";

export class VariableExpressionNode extends ExpressionNode {
    variable: string;

    *children(): Generator<Node> {}

    private resolved?:
        | {
              type: "variable";
              node: Node;
          }
        | {
              type: "constant";
              node: Node;
              substitutions: Map<TypeParameterNode, Type>;
          };

    constructor(variable: string, span: Span) {
        super(span);
        this.variable = variable;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        const definition = visitor.resolve(
            this.variable,
            [VariableDefinition, ConstantDefinition],
            this,
        );

        if (definition == null) {
            return;
        }

        if (definition instanceof VariableDefinition) {
            visitor.constraint(new GroupConstraint(this, definition.node));

            this.resolved = {
                type: "variable",
                node: definition.node,
            };
        } else if (definition instanceof ConstantDefinition) {
            const substitutions = new Map<TypeParameterNode, Type>();

            visitor.constraint(
                new InstantiateConstraint({
                    source: this,
                    definition: definition.node,
                    substitutions,
                    replacements: new Map([[definition.node, this]]),
                }),
            );

            this.resolved = {
                type: "constant",
                node: definition.node,
                substitutions,
            };
        }
    }

    codegen(codegen: Codegen): void {
        if (this.resolved == null) {
            codegen.fail();
        }

        switch (this.resolved.type) {
            case "variable": {
                codegen.write(this.span, codegen.node(this.resolved.node));
                break;
            }
            case "constant": {
                codegen.write(
                    this.span,
                    `await runtime.constant(${codegen.node(this.resolved.node)}, types, {`,
                );

                for (const [parameter, type] of this.resolved.substitutions) {
                    codegen.write(this.span, `${codegen.node(parameter)}: `);
                    codegen.writeType(this.span, type);
                    codegen.write(this.span, ", ");
                }

                codegen.write(this.span, "})");

                break;
            }
            default: {
                this.resolved satisfies never;
            }
        }
    }
}
