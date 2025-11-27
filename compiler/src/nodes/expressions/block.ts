import type { Codegen } from "../../codegen";
import type { Node } from "../../node";
import type { Span } from "../../span";
import { types } from "../../typecheck";
import { TypeConstraint } from "../../typecheck/constraints/type";
import type { Visitor } from "../../visit";
import type { StatementNode } from "../statements";
import { ExpressionNode } from "./index";

export class BlockExpressionNode extends ExpressionNode {
    statements: StatementNode[];

    constructor(statements: StatementNode[], span: Span) {
        super(span);
        this.statements = statements;
    }

    *children(): Generator<Node> {
        yield* this.statements;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.pushScope();

        for (const statement of this.statements) {
            visitor.visit(statement);
        }

        visitor.popScope();

        visitor.constraint(
            new TypeConstraint(this, types.block(this.statements.at(-1) ?? types.tuple([]))),
        );
    }

    codegen(codegen: Codegen): void {
        codegen.write(this.span, "(async () => {\n");

        this.statements.forEach((statement, index) => {
            if (index + 1 === this.statements.length) {
                codegen.write(this.span, "return ");
            }

            codegen.write(this.span, statement, ";\n");
        });

        codegen.write(this.span, "})");
    }
}
