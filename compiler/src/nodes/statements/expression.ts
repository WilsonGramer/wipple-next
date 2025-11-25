import { UnsupportedAttribute } from "../../visit/attributes";
import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import type { AttributeNode } from "../attributes";
import type { ExpressionNode } from "../expressions";
import { StatementNode } from "./index";
import { GroupConstraint } from "../../typecheck/constraints/group";
import type { Codegen } from "../../codegen";

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

    *children() {
        yield this.expression;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.enqueue("afterAllDefinitions", () => {
            visitor.visit(this.expression);
            visitor.constraint(new GroupConstraint(this, this.expression));
        });
    }

    codegen(codegen: Codegen): void {
        codegen.write(this.span, this.expression, ";\n");
    }
}
