import type { Codegen } from "../../codegen";
import type { Node } from "../../node";
import type { Span } from "../../span";
import { GroupConstraint } from "../../typecheck/constraints/group";
import type { Visitor } from "../../visit";
import { UnsupportedAttribute } from "../../visit/attributes";
import type { AttributeNode } from "../attributes";
import type { ExpressionNode } from "../expressions";
import { StatementNode } from "./index";

export class ExpressionStatementNode extends StatementNode {
    expression: ExpressionNode;

    constructor(
        comments: string[],
        attributes: AttributeNode[],
        expression: ExpressionNode,
        span: Span,
    ) {
        super(comments, span);
        this.expression = expression;

        for (const attribute of attributes) {
            attribute.facts.set(UnsupportedAttribute, null);
        }

        this.isHidden = true;
    }

    *children(): Generator<Node> {
        yield this.expression;
    }

    visit(visitor: Visitor): void {
        visitor.enqueue("afterAllDefinitions", () => {
            visitor.visit(this.expression);
            visitor.constraint(new GroupConstraint(this, this.expression));
        });
    }

    codegen(codegen: Codegen): void {
        codegen.write(this.span, this.expression, ";\n");
    }
}
