import type { Codegen } from "../../codegen";
import { InternalNode, type Node } from "../../node";
import type { Span } from "../../span";
import { GroupConstraint } from "../../typecheck/constraints/group";
import type { Visitor } from "../../visit";
import { UnsupportedAttribute } from "../../visit/attributes";
import { ConstantDefinition } from "../../visit/definitions";
import type { AttributeNode } from "../attributes";
import type { ExpressionNode } from "../expressions";
import { type PatternNode } from "../patterns";
import { VariablePatternNode } from "../patterns/variable";
import { StatementNode } from "./index";

export class AssignmentNode extends StatementNode {
    pattern: PatternNode;
    value: ExpressionNode;

    private temporary?: InternalNode;

    constructor(
        comments: string[],
        attributes: AttributeNode[],
        pattern: PatternNode,
        value: ExpressionNode,
        span: Span,
    ) {
        super(comments, span);
        this.pattern = pattern;
        this.value = value;

        for (const attribute of attributes) {
            attribute.facts.set(UnsupportedAttribute, null);
        }
    }

    *children(): Generator<Node> {
        yield this.pattern;
        yield this.value;
    }

    visit(visitor: Visitor): void {
        visitor.enqueue("afterAllDefinitions", () => {
            // Try assigning to an existing constant if possible
            if (this.pattern instanceof VariablePatternNode) {
                const [constantDefinition] = visitor.peek(this.pattern.variable, [
                    ConstantDefinition,
                ]);

                if (constantDefinition != null && !constantDefinition.value.assigned) {
                    const constantType = constantDefinition.value.type;

                    visitor.defining(constantDefinition.node, () => {
                        visitor.currentDefinition!.withinConstantValue = true;

                        visitor.visit(this.value);

                        // Ensure the value is assignable to the constant's type
                        visitor.constraint(new GroupConstraint(this.value, constantType));

                        constantDefinition.value = { assigned: true, node: this.value };

                        return undefined;
                    });

                    return;
                }
            }

            visitor.visit(this.value);

            this.temporary = new InternalNode(this.value.span);
            visitor.matching(this.temporary, () => {
                visitor.visit(this.pattern);
            });

            visitor.constraint(new GroupConstraint(this.pattern, this.value));
        });
    }

    codegen(codegen: Codegen): void {
        if (this.temporary == null) {
            return; // assigned to constant
        }

        codegen.write(this.span, `var ${codegen.node(this.temporary)};\n`);

        for (const temporary of new Set(this.pattern.temporaries())) {
            if (temporary === this.temporary) {
                continue;
            }

            codegen.write(this.span, `var ${codegen.node(temporary)};\n`);
        }

        codegen.write(this.span, codegen.node(this.temporary), " = ", this.value, ";\n");

        codegen.write(
            this.span,
            "if (true",
            this.pattern,
            `) {} else { throw new Error("unreachable"); }\n`,
        );
    }
}
