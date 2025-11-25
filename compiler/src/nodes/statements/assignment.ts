import type { Span } from "../../span";
import type { AttributeNode } from "../attributes";
import type { ExpressionNode } from "../expressions";
import { StatementNode } from "./index";
import { type PatternNode } from "../patterns";
import { UnsupportedAttribute } from "../../visit/attributes";
import type { Visitor } from "../../visit";
import { VariablePatternNode } from "../patterns/variable";
import { ConstantDefinition } from "../../visit/definitions";
import { GroupConstraint } from "../../typecheck/constraints/group";
import type { Codegen } from "../../codegen";
import { InternalNode, type Node } from "../../node";

export class AssignmentNode extends StatementNode {
    pattern: PatternNode;
    value: ExpressionNode;

    private temporary?: Node;

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

    *children() {
        yield this.pattern;
        yield this.value;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.enqueue("afterAllDefinitions", () => {
            // Try assigning to an existing constant if possible
            if (this.pattern instanceof VariablePatternNode) {
                const constantDefinition = visitor.peek(this.pattern.variable, [
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
            codegen.fail();
        }

        codegen.write("let ", codegen.node(this.temporary), " = ", this.value, ";\n");

        const variables = this.pattern
            .traverse()
            .filter((node) => node instanceof VariablePatternNode);

        for (const variable of variables) {
            codegen.write(`let ${codegen.node(variable)};\n`);
        }

        codegen.write("if (true", this.pattern, ") {}\n");
    }
}
