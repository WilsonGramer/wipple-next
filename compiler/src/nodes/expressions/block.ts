import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import type { StatementNode } from "../statements";
import { ExpressionNode } from "./index";
import { types } from "../../typecheck";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { EmptyStatementNode } from "../statements/empty";

export class BlockExpressionNode extends ExpressionNode {
    statements: StatementNode[];

    constructor(statements: StatementNode[], span: Span) {
        super(span);
        this.statements = statements;
    }

    *children() {
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
            new TypeConstraint(this, types.block(statements.at(-1) ?? types.unit())),
        );
    }
}
