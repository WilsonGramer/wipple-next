import type { Codegen } from "../../codegen";
import type { Node } from "../../node";
import type { Span } from "../../span";
import { types } from "../../typecheck";
import { TypeConstraint } from "../../typecheck/constraints/type";
import type { Visitor } from "../../visit";
import type { StatementNode } from "../statements";
import { EmptyStatementNode } from "../statements/empty";
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

        const statements = this.statements.filter(
            (statement) => !(statement instanceof EmptyStatementNode),
        );

        for (const statement of statements) {
            visitor.visit(statement);
        }

        visitor.popScope();

        visitor.constraint(
            new TypeConstraint(this, types.block(statements.at(-1) ?? types.tuple([]))),
        );
    }

    codegen(codegen: Codegen): void {
        codegen.write(this.span, "(async () => {\n");

        const statements = this.statements.filter(
            (statement) => !(statement instanceof EmptyStatementNode),
        );

        statements.forEach((statement, index) => {
            if (index + 1 === statements.length) {
                codegen.write(this.span, "return ");
            }

            codegen.write(this.span, statement, ";\n");
        });

        codegen.write(this.span, "})");
    }
}
